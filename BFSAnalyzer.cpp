#include "BFSAnalyzer.h"
#include <iostream>
#include <queue>
#include <set>

std::vector<int> BFSAnalyzer::traceUpstream(const ProvenanceGraph& graph, int startID) const {
    return traceUpstreamDetailed(graph, startID).ancestors;
}

BFSAnalyzer::Result BFSAnalyzer::traceUpstreamDetailed(
    const ProvenanceGraph& graph, int startID, bool filterByProduct, int productID) const {
    Result result;
    if (!graph.actorExists(startID)) {
        return result;
    }

    std::set<int> visited;
    std::queue<int> pending;
    visited.insert(startID);
    pending.push(startID);

    while (!pending.empty()) {
        int current = pending.front();
        pending.pop();
        const std::vector<Transfer>& incoming = graph.getIncomingTransfers(current);
        for (size_t i = 0; i < incoming.size(); ++i) {
            if (filterByProduct && incoming[i].getProductID() != productID) continue;
            int neighbour = incoming[i].getSourceID();
            if (visited.find(neighbour) == visited.end()) {
                visited.insert(neighbour);
                pending.push(neighbour);
                result.ancestors.push_back(neighbour);
                result.discoveryTransfers.push_back(incoming[i]);
            }
        }
    }
    return result;
}

void BFSAnalyzer::displayUpstream(const ProvenanceGraph& graph, int startID) const {
    if (!graph.actorExists(startID)) {
        std::cout << "\nInvalid actor ID.\n";
        return;
    }
    std::vector<int> ancestors = traceUpstream(graph, startID);
    std::cout << "\nSelected Actor: " << graph.getActor(startID).getActorName()
              << " [ID " << startID << "]\n";
    std::cout << "Upstream Ancestors (reverse BFS):\n";
    if (ancestors.empty()) {
        std::cout << "None\n";
        return;
    }
    for (size_t i = 0; i < ancestors.size(); ++i) {
        const Actor& actor = graph.getActor(ancestors[i]);
        std::cout << (i + 1) << ". " << actor.getActorName()
                  << " [ID " << ancestors[i] << "]\n";
    }
    std::cout << "Total upstream ancestors: " << ancestors.size() << "\n";
}
