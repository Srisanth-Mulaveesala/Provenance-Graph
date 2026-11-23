#ifndef BFS_ANALYZER_H
#define BFS_ANALYZER_H

#include "ProvenanceGraph.h"
#include <vector>

class BFSAnalyzer {
public:
    struct Result {
        std::vector<int> ancestors;
        std::vector<Transfer> discoveryTransfers;
    };

    Result traceUpstreamDetailed(const ProvenanceGraph& graph, int startID,
                                 bool filterByProduct = false, int productID = 0) const;
    std::vector<int> traceUpstream(const ProvenanceGraph& graph, int startID) const;
    void displayUpstream(const ProvenanceGraph& graph, int startID) const;
};

#endif
