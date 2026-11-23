#include "JsonMode.h"
#include "JsonValue.h"
#include "ProvenanceGraph.h"
#include "BFSAnalyzer.h"
#include "CycleDetector.h"
#include "SyntheticDataGenerator.h"
#include "PerformanceAnalyzer.h"
#include "Actor.h"
#include <chrono>
#include <fstream>
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>

namespace {
int integerField(const JsonValue& object, const std::string& key, bool required, int fallback = 0) {
    if (!object.contains(key)) {
        if (required) throw std::runtime_error("Missing field: " + key);
        return fallback;
    }
    double value = object.at(key).asNumber();
    if (value < 0 || value > std::numeric_limits<int>::max() || value != static_cast<int>(value))
        throw std::runtime_error("Field '" + key + "' must be a non-negative integer");
    return static_cast<int>(value);
}

unsigned int seedField(const JsonValue& object) {
    if (!object.contains("seed")) return 2026u;
    double value = object.at("seed").asNumber();
    if (value < 0 || value > std::numeric_limits<unsigned int>::max() ||
        value != static_cast<double>(static_cast<unsigned int>(value)))
        throw std::runtime_error("Field 'seed' must be an unsigned 32-bit integer");
    return static_cast<unsigned int>(value);
}

void loadGraph(const JsonValue& input, ProvenanceGraph& graph) {
    const JsonValue& graphJson = input.at("graph");
    const std::vector<JsonValue>& actors = graphJson.at("actors").asArray();
    const std::vector<JsonValue>& transfers = graphJson.at("transfers").asArray();
    for (size_t i = 0; i < actors.size(); ++i) {
        const JsonValue& actor = actors[i];
        int id = integerField(actor, "id", true);
        std::string name = actor.at("name").asString();
        std::string type = actor.at("type").asString();
        if (name.empty() || type.empty()) throw std::runtime_error("Actor name and type cannot be empty");
        if (!graph.addActor(Actor(id, name, type)))
            throw std::runtime_error("Invalid or duplicate actor ID: " + std::to_string(id));
    }
    for (size_t i = 0; i < transfers.size(); ++i) {
        const JsonValue& transfer = transfers[i];
        int source = integerField(transfer, "source", true);
        int destination = integerField(transfer, "destination", true);
        int product = integerField(transfer, "product", true);
        if (!graph.addTransfer(source, destination, product))
            throw std::runtime_error("Invalid or duplicate transfer at index " + std::to_string(i));
    }
}

JsonValue graphJson(const ProvenanceGraph& graph) {
    JsonValue output = JsonValue::object();
    JsonValue actors = JsonValue::array();
    const std::map<int, Actor>& actorMap = graph.getActors();
    for (std::map<int, Actor>::const_iterator it = actorMap.begin(); it != actorMap.end(); ++it) {
        JsonValue actor = JsonValue::object();
        actor["id"] = JsonValue(static_cast<double>(it->first));
        actor["name"] = JsonValue(it->second.getActorName());
        actor["type"] = JsonValue(it->second.getActorType());
        actors.pushBack(actor);
    }
    JsonValue transfers = JsonValue::array();
    const std::vector<Transfer>& edgeList = graph.getTransfers();
    for (size_t i = 0; i < edgeList.size(); ++i) {
        JsonValue transfer = JsonValue::object();
        transfer["source"] = JsonValue(static_cast<double>(edgeList[i].getSourceID()));
        transfer["destination"] = JsonValue(static_cast<double>(edgeList[i].getDestinationID()));
        transfer["product"] = JsonValue(static_cast<double>(edgeList[i].getProductID()));
        transfers.pushBack(transfer);
    }
    output["actors"] = actors;
    output["transfers"] = transfers;
    output["vertices"] = JsonValue(static_cast<double>(graph.getVertexCount()));
    output["edges"] = JsonValue(static_cast<double>(graph.getEdgeCount()));
    return output;
}

JsonValue cyclesJson(const std::vector<CycleDetector::Cycle>& cycles) {
    JsonValue output = JsonValue::array();
    for (size_t c = 0; c < cycles.size(); ++c) {
        JsonValue cycle = JsonValue::array();
        for (size_t i = 0; i < cycles[c].size(); ++i)
            cycle.pushBack(JsonValue(static_cast<double>(cycles[c][i])));
        output.pushBack(cycle);
    }
    return output;
}

JsonValue resultJson(const PerformanceAnalyzer::Result& result) {
    JsonValue value = JsonValue::object();
    value["vertices"] = JsonValue(static_cast<double>(result.vertices));
    value["edges"] = JsonValue(static_cast<double>(result.edges));
    value["bfsMilliseconds"] = JsonValue(result.bfsMilliseconds);
    value["dfsMilliseconds"] = JsonValue(result.dfsMilliseconds);
    value["injectedCycles"] = JsonValue(static_cast<double>(result.injectedCycles));
    value["detectedCycles"] = JsonValue(static_cast<double>(result.detectedCycles));
    value["truePositives"] = JsonValue(static_cast<double>(result.truePositives));
    value["falsePositives"] = JsonValue(static_cast<double>(result.falsePositives));
    value["falseNegatives"] = JsonValue(static_cast<double>(result.falseNegatives));
    value["precision"] = JsonValue(result.precision);
    value["recall"] = JsonValue(result.recall);
    value["f1"] = JsonValue(result.f1);
    return value;
}

JsonValue errorJson(const std::string& message) {
    JsonValue output = JsonValue::object();
    output["success"] = JsonValue(false);
    output["error"] = JsonValue(message);
    return output;
}
}

int runJsonMode(const std::string& inputPath, const std::string& outputPath) {
    JsonValue response;
    std::ostringstream hiddenConsoleOutput;
    std::streambuf* previousConsoleBuffer = std::cout.rdbuf(hiddenConsoleOutput.rdbuf());
    try {
        std::ifstream inputFile(inputPath.c_str(), std::ios::binary);
        if (!inputFile) throw std::runtime_error("Could not open input JSON file");
        std::ostringstream inputBuffer;
        inputBuffer << inputFile.rdbuf();
        JsonValue input = JsonValue::parse(inputBuffer.str());
        std::string operation = input.at("operation").asString();
        response = JsonValue::object();
        response["success"] = JsonValue(true);
        response["operation"] = JsonValue(operation);

        if (operation == "graph" || operation == "bfs" || operation == "dfs") {
            ProvenanceGraph graph;
            loadGraph(input, graph);
            if (operation == "graph") {
                response["graph"] = graphJson(graph);
            } else if (operation == "bfs") {
                int actorId = integerField(input, "actorId", true);
                if (!graph.actorExists(actorId)) throw std::runtime_error("Unknown actorId");
                bool filterByProduct = input.contains("productId");
                int productId = filterByProduct ? integerField(input, "productId", true) : 0;
                BFSAnalyzer analyzer;
                std::chrono::steady_clock::time_point start = std::chrono::steady_clock::now();
                const BFSAnalyzer::Result bfsResult = analyzer.traceUpstreamDetailed(
                    graph, actorId, filterByProduct, productId);
                std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
                JsonValue values = JsonValue::array();
                for (size_t i = 0; i < bfsResult.ancestors.size(); ++i)
                    values.pushBack(JsonValue(static_cast<double>(bfsResult.ancestors[i])));
                JsonValue discoveryEdges = JsonValue::array();
                for (size_t i = 0; i < bfsResult.discoveryTransfers.size(); ++i) {
                    JsonValue edge = JsonValue::object();
                    edge["source"] = JsonValue(static_cast<double>(
                        bfsResult.discoveryTransfers[i].getSourceID()));
                    edge["destination"] = JsonValue(static_cast<double>(
                        bfsResult.discoveryTransfers[i].getDestinationID()));
                    edge["product"] = JsonValue(static_cast<double>(
                        bfsResult.discoveryTransfers[i].getProductID()));
                    discoveryEdges.pushBack(edge);
                }
                response["actorId"] = JsonValue(static_cast<double>(actorId));
                response["ancestors"] = values;
                response["traversalOrder"] = values;
                response["discoveryEdges"] = discoveryEdges;
                response["upstreamCount"] = JsonValue(static_cast<double>(bfsResult.ancestors.size()));
                if (filterByProduct) response["productId"] = JsonValue(static_cast<double>(productId));
                response["executionTimeMs"] = JsonValue(
                    std::chrono::duration<double, std::milli>(end - start).count());
            } else {
                CycleDetector detector;
                std::chrono::steady_clock::time_point start = std::chrono::steady_clock::now();
                std::vector<CycleDetector::Cycle> cycles = detector.detectCycles(graph);
                std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
                response["cycles"] = cyclesJson(cycles);
                response["executionTimeMs"] = JsonValue(
                    std::chrono::duration<double, std::milli>(end - start).count());
            }
        } else if (operation == "synthetic") {
            int vertices = integerField(input, "vertices", true);
            int edges = integerField(input, "edges", true);
            int cycles = integerField(input, "cycles", true);
            unsigned int seedValue = seedField(input);
            if (vertices < 1 || vertices > 10000 || edges > 50000)
                throw std::runtime_error("Synthetic parameters must satisfy vertices 1-10000 and edges 0-50000");
            ProvenanceGraph graph;
            SyntheticDataGenerator generator;
            SyntheticDataGenerator::GroundTruth truth =
                generator.generate(graph, vertices, edges, cycles, seedValue);
            response["graph"] = graphJson(graph);
            response["truth"] = cyclesJson(truth.injectedCycles);
        } else if (operation == "performance") {
            PerformanceAnalyzer analyzer;
            std::vector<PerformanceAnalyzer::Result> results;
            if (input.contains("vertices") || input.contains("edges") || input.contains("cycles")) {
                int vertices = integerField(input, "vertices", true);
                int edges = integerField(input, "edges", true);
                int cycles = integerField(input, "cycles", true);
                unsigned int seed = seedField(input);
                if (vertices < 1 || vertices > 10000 || edges > 50000)
                    throw std::runtime_error("Performance parameters must satisfy vertices 1-10000 and edges 0-50000");
                results.push_back(analyzer.runConfiguration(vertices, edges, cycles, seed));
            } else {
                results = analyzer.runAllConfigurations();
            }
            JsonValue values = JsonValue::array();
            for (size_t i = 0; i < results.size(); ++i) values.pushBack(resultJson(results[i]));
            response["results"] = values;
        } else {
            throw std::runtime_error("Unsupported operation: " + operation);
        }
    } catch (const std::exception& error) {
        response = errorJson(error.what());
    }
    std::cout.rdbuf(previousConsoleBuffer);

    std::ofstream outputFile(outputPath.c_str(), std::ios::binary | std::ios::trunc);
    if (!outputFile) {
        std::cerr << "Could not open output JSON file: " << outputPath << "\n";
        return 2;
    }
    outputFile << response.stringify() << "\n";
    if (!outputFile) {
        std::cerr << "Could not write output JSON file: " << outputPath << "\n";
        return 2;
    }
    return response.contains("success") && response.at("success").asBoolean() ? 0 : 1;
}
