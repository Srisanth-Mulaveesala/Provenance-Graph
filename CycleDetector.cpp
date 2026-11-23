#include "CycleDetector.h"
#include <algorithm>
#include <iostream>

CycleDetector::Cycle CycleDetector::canonicalCycle(const CycleDetector::Cycle& cycle) {
    CycleDetector::Cycle open = cycle;
    if (open.size() > 1 && open.front() == open.back()) {
        open.pop_back();
    }
    if (open.empty()) return open;

    CycleDetector::Cycle best = open;
    CycleDetector::Cycle current = open;
    for (size_t i = 1; i < open.size(); ++i) {
        std::rotate(current.begin(), current.begin() + 1, current.end());
        if (current < best) best = current;
    }
    best.push_back(best.front());
    return best;
}

void CycleDetector::dfs(int vertex, const ProvenanceGraph& graph,
                        std::map<int, int>& colour,
                        std::map<int, int>& parent,
                        std::set<std::vector<int>>& uniqueCycles,
                        std::vector<CycleDetector::Cycle>& cycleList) const {
    colour[vertex] = 1; // GREY

    const std::vector<int>& outgoing = graph.getOutgoing(vertex);
    for (size_t i = 0; i < outgoing.size(); ++i) {
        int neighbour = outgoing[i];
        if (colour[neighbour] == 0) {
            parent[neighbour] = vertex;
            dfs(neighbour, graph, colour, parent, uniqueCycles, cycleList);
        } else if (colour[neighbour] == 1) {
            CycleDetector::Cycle reversePath;
            int current = vertex;
            reversePath.push_back(current);
            while (current != neighbour) {
                current = parent[current];
                reversePath.push_back(current);
            }
            std::reverse(reversePath.begin(), reversePath.end());
            reversePath.push_back(neighbour);

            CycleDetector::Cycle canonical = canonicalCycle(reversePath);
            if (uniqueCycles.find(canonical) == uniqueCycles.end()) {
                uniqueCycles.insert(canonical);
                cycleList.push_back(canonical);
            }
        }
    }
    colour[vertex] = 2; // BLACK
}

std::vector<CycleDetector::Cycle> CycleDetector::detectCycles(const ProvenanceGraph& graph) const {
    std::vector<CycleDetector::Cycle> cycleList;
    std::map<int, int> colour;
    std::map<int, int> parent;
    std::set<std::vector<int>> uniqueCycles;

    std::vector<int> ids = graph.getActorIDs();
    for (size_t i = 0; i < ids.size(); ++i) {
        colour[ids[i]] = 0;
        parent[ids[i]] = -1;
    }

    for (size_t i = 0; i < ids.size(); ++i) {
        if (colour[ids[i]] == 0) {
            dfs(ids[i], graph, colour, parent, uniqueCycles, cycleList);
        }
    }
    return cycleList;
}

void CycleDetector::displayCycles(const ProvenanceGraph& graph) const {
    if (graph.getVertexCount() == 0) {
        std::cout << "\nThe provenance graph is empty.\n";
        return;
    }
    std::vector<CycleDetector::Cycle> cycles = detectCycles(graph);
    if (cycles.empty()) {
        std::cout << "\nNo directed cycles detected.\n";
        std::cout << "No suspicious circular transfer pattern was found.\n";
        return;
    }

    std::cout << "\nDIRECTED CYCLE DETECTED\n";
    std::cout << "A cycle shows circular movement; it is not definitive proof of fraud.\n";
    std::cout << "Unique directed back-edge cycles detected: " << cycles.size() << "\n";
    for (size_t c = 0; c < cycles.size(); ++c) {
        std::cout << "\nCycle " << (c + 1) << ":\n";
        for (size_t i = 0; i < cycles[c].size(); ++i) {
            int id = cycles[c][i];
            std::cout << "  " << graph.getActor(id).getActorName()
                      << " [ID " << id << "]";
            if (i + 1 < cycles[c].size()) std::cout << "\n    ->\n";
        }
        std::cout << "\n";
    }
}
