#include "SyntheticDataGenerator.h"
#include <algorithm>
#include <iostream>
#include <random>
#include <stdexcept>

SyntheticDataGenerator::GroundTruth SyntheticDataGenerator::generate(
    ProvenanceGraph& graph, int vertexCount, int edgeCount,
    int cycleCount, unsigned int seed) {

    if (vertexCount < 1 || edgeCount < 0 || cycleCount < 0 ||
        cycleCount > vertexCount / 3 ||
        edgeCount < vertexCount - 1 + cycleCount ||
        (vertexCount == 1 && edgeCount != 0)) {
        throw std::invalid_argument(
            "Synthetic configuration is infeasible: require at most floor(vertices/3) cycles and at least vertices-1+cycles edges");
    }

    graph.clear();
    GroundTruth truth;

    const char* types[] = {"Supplier", "Manufacturer", "Distributor", "Pharmacy", "Customer"};
    for (int i = 0; i < vertexCount; ++i) {
        std::string name = "Actor_" + std::to_string(i);
        graph.addActor(Actor(i, name, types[i % 5]));
    }

    // Build a valid acyclic backbone of n - 1 directed edges.
    for (int i = 0; i + 1 < vertexCount; ++i) {
        graph.addTransfer(i, i + 1, 1001);
    }

    std::mt19937 rng(seed);

    // Inject disjoint three-vertex cycles using backbone edges and one closing edge each.
    for (int c = 0; c < cycleCount; ++c) {
        int start = c * 3;
        int end = start + 2;
        graph.addTransfer(end, start, 2000 + c);
        CycleDetector::Cycle cycle;
        cycle.push_back(start);
        cycle.push_back(start + 1);
        cycle.push_back(end);
        cycle.push_back(start);
        truth.injectedCycles.push_back(canonicalCycle(cycle));
    }

    // Additional forward edges keep injected back-edge cycles independently reportable.
    int extraEdges = edgeCount - static_cast<int>(graph.getEdgeCount());
    for (int added = 0; added < extraEdges; ++added) {
        int source = static_cast<int>(rng() % (vertexCount - 1));
        int destination = source + 1 +
            static_cast<int>(rng() % (vertexCount - source - 1));
        graph.addTransfer(source, destination, 100000 + added);
    }

    std::cout << "\nSynthetic graph generated: " << vertexCount
              << " actors, " << graph.getEdgeCount()
              << " transfers, " << truth.injectedCycles.size()
              << " injected cycles (seed " << seed << ").\n";
    return truth;
}

CycleDetector::Cycle SyntheticDataGenerator::canonicalCycle(
    const CycleDetector::Cycle& cycle) {
    if (cycle.size() < 2) return cycle;
    CycleDetector::Cycle open = cycle;
    if (open.front() == open.back()) open.pop_back();
    CycleDetector::Cycle best = open;
    CycleDetector::Cycle current = open;
    for (size_t i = 1; i < open.size(); ++i) {
        std::rotate(current.begin(), current.begin() + 1, current.end());
        if (current < best) best = current;
    }
    best.push_back(best.front());
    return best;
}
