#include "PerformanceAnalyzer.h"
#include <chrono>
#include <iostream>
#include <iomanip>
#include <set>

std::vector<PerformanceAnalyzer::Result> PerformanceAnalyzer::runAllConfigurations() {
    const int sizes[][3] = {
        {100, 150, 2},
        {500, 750, 5},
        {1000, 1500, 10},
        {5000, 7500, 20}
    };

    std::vector<Result> results;
    for (int i = 0; i < 4; ++i) {
        ProvenanceGraph graph;
        SyntheticDataGenerator generator;
        SyntheticDataGenerator::GroundTruth truth =
            generator.generate(graph, sizes[i][0], sizes[i][1], sizes[i][2], 2026u + i);

        BFSAnalyzer bfs;
        CycleDetector dfs;

        std::chrono::steady_clock::time_point bfsStart =
            std::chrono::steady_clock::now();
        std::vector<int> ancestors = bfs.traceUpstream(graph, sizes[i][0] - 1);
        std::chrono::steady_clock::time_point bfsEnd =
            std::chrono::steady_clock::now();

        std::chrono::steady_clock::time_point dfsStart =
            std::chrono::steady_clock::now();
        std::vector<CycleDetector::Cycle> detected = dfs.detectCycles(graph);
        std::chrono::steady_clock::time_point dfsEnd =
            std::chrono::steady_clock::now();

        std::set<CycleDetector::Cycle> injectedSet(
            truth.injectedCycles.begin(), truth.injectedCycles.end());
        std::set<CycleDetector::Cycle> detectedSet(
            detected.begin(), detected.end());

        int tp = 0;
        for (std::set<CycleDetector::Cycle>::const_iterator it = detectedSet.begin();
             it != detectedSet.end(); ++it) {
            if (injectedSet.find(*it) != injectedSet.end()) ++tp;
        }
        int fp = static_cast<int>(detectedSet.size()) - tp;
        int fn = static_cast<int>(injectedSet.size()) - tp;

        double precision = (tp + fp == 0) ? 0.0 :
                           static_cast<double>(tp) / (tp + fp);
        double recall = (tp + fn == 0) ? 0.0 :
                        static_cast<double>(tp) / (tp + fn);
        double f1 = (precision + recall == 0.0) ? 0.0 :
                    2.0 * precision * recall / (precision + recall);

        Result result;
        result.vertices = sizes[i][0];
        result.edges = static_cast<int>(graph.getEdgeCount());
        result.bfsMilliseconds =
            std::chrono::duration<double, std::milli>(bfsEnd - bfsStart).count();
        result.dfsMilliseconds =
            std::chrono::duration<double, std::milli>(dfsEnd - dfsStart).count();
        result.injectedCycles = static_cast<int>(truth.injectedCycles.size());
        result.detectedCycles = static_cast<int>(detectedSet.size());
        result.truePositives = tp;
        result.falsePositives = fp;
        result.falseNegatives = fn;
        result.precision = precision;
        result.recall = recall;
        result.f1 = f1;
        results.push_back(result);

        std::cout << "  BFS from Actor_" << sizes[i][0] - 1 << " found "
                  << ancestors.size() << " ancestors.\n";
    }

    std::cout << "\nPERFORMANCE ANALYSIS (BFS start: last actor in each graph)\n";
    std::cout << "Times use milliseconds; metrics compare normalized vertex sequences.\n";
    std::cout << std::left << std::setw(10) << "Vertices"
              << std::setw(9) << "Edges"
              << std::setw(12) << "BFS ms"
              << std::setw(12) << "DFS ms"
              << std::setw(9) << "Inj."
              << std::setw(9) << "Detected"
              << std::setw(7) << "TP"
              << std::setw(7) << "FP"
              << std::setw(7) << "FN"
              << std::setw(10) << "Precision"
              << std::setw(9) << "Recall"
              << std::setw(8) << "F1" << "\n";
    std::cout << std::string(105, '-') << "\n";
    for (size_t i = 0; i < results.size(); ++i) {
        const Result& r = results[i];
        std::cout << std::left << std::setw(10) << r.vertices
                  << std::setw(9) << r.edges
                  << std::fixed << std::setprecision(4)
                  << std::setw(12) << r.bfsMilliseconds
                  << std::setw(12) << r.dfsMilliseconds
                  << std::setprecision(0)
                  << std::setw(9) << r.injectedCycles
                  << std::setw(9) << r.detectedCycles
                  << std::setw(7) << r.truePositives
                  << std::setw(7) << r.falsePositives
                  << std::setw(7) << r.falseNegatives
                  << std::setprecision(4)
                  << std::setw(10) << r.precision
                  << std::setw(9) << r.recall
                  << std::setw(8) << r.f1 << "\n";
    }
    return results;
}

PerformanceAnalyzer::Result PerformanceAnalyzer::runConfiguration(
    int vertices, int edges, int cycles, unsigned int seed) {
    ProvenanceGraph graph;
    SyntheticDataGenerator generator;
    SyntheticDataGenerator::GroundTruth truth =
        generator.generate(graph, vertices, edges, cycles, seed);
    BFSAnalyzer bfs;
    CycleDetector dfs;

    std::chrono::steady_clock::time_point bfsStart = std::chrono::steady_clock::now();
    bfs.traceUpstream(graph, vertices - 1);
    std::chrono::steady_clock::time_point bfsEnd = std::chrono::steady_clock::now();
    std::chrono::steady_clock::time_point dfsStart = std::chrono::steady_clock::now();
    std::vector<CycleDetector::Cycle> detected = dfs.detectCycles(graph);
    std::chrono::steady_clock::time_point dfsEnd = std::chrono::steady_clock::now();

    std::set<CycleDetector::Cycle> injectedSet(truth.injectedCycles.begin(), truth.injectedCycles.end());
    std::set<CycleDetector::Cycle> detectedSet(detected.begin(), detected.end());
    int tp = 0;
    for (std::set<CycleDetector::Cycle>::const_iterator it = detectedSet.begin();
         it != detectedSet.end(); ++it) {
        if (injectedSet.find(*it) != injectedSet.end()) ++tp;
    }
    int fp = static_cast<int>(detectedSet.size()) - tp;
    int fn = static_cast<int>(injectedSet.size()) - tp;

    Result result;
    result.vertices = vertices;
    result.edges = static_cast<int>(graph.getEdgeCount());
    result.bfsMilliseconds = std::chrono::duration<double, std::milli>(bfsEnd - bfsStart).count();
    result.dfsMilliseconds = std::chrono::duration<double, std::milli>(dfsEnd - dfsStart).count();
    result.injectedCycles = static_cast<int>(truth.injectedCycles.size());
    result.detectedCycles = static_cast<int>(detectedSet.size());
    result.truePositives = tp;
    result.falsePositives = fp;
    result.falseNegatives = fn;
    result.precision = (tp + fp == 0) ? 0.0 : static_cast<double>(tp) / (tp + fp);
    result.recall = (tp + fn == 0) ? 0.0 : static_cast<double>(tp) / (tp + fn);
    result.f1 = (result.precision + result.recall == 0.0) ? 0.0 :
                2.0 * result.precision * result.recall / (result.precision + result.recall);
    return result;
}
