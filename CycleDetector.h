#ifndef CYCLE_DETECTOR_H
#define CYCLE_DETECTOR_H

#include "ProvenanceGraph.h"
#include <map>
#include <set>
#include <vector>

class CycleDetector {
public:
    typedef std::vector<int> Cycle;

    std::vector<Cycle> detectCycles(const ProvenanceGraph& graph) const;
    void displayCycles(const ProvenanceGraph& graph) const;

private:
    void dfs(int vertex, const ProvenanceGraph& graph,
             std::map<int, int>& colour,
             std::map<int, int>& parent,
             std::set<std::vector<int>>& uniqueCycles,
             std::vector<Cycle>& cycleList) const;

    static Cycle canonicalCycle(const Cycle& cycle);
};

#endif
