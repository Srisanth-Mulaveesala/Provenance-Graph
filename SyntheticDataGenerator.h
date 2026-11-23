#ifndef SYNTHETIC_DATA_GENERATOR_H
#define SYNTHETIC_DATA_GENERATOR_H

#include "ProvenanceGraph.h"
#include "CycleDetector.h"
#include <set>
#include <vector>

class SyntheticDataGenerator {
public:
    struct GroundTruth {
        std::vector<CycleDetector::Cycle> injectedCycles;
    };

    GroundTruth generate(ProvenanceGraph& graph, int vertexCount,
                         int edgeCount, int cycleCount, unsigned int seed);

private:
    static CycleDetector::Cycle canonicalCycle(const CycleDetector::Cycle& cycle);
};

#endif
