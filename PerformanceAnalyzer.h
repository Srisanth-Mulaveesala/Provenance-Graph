#ifndef PERFORMANCE_ANALYZER_H
#define PERFORMANCE_ANALYZER_H

#include "ProvenanceGraph.h"
#include "SyntheticDataGenerator.h"
#include "BFSAnalyzer.h"
#include "CycleDetector.h"
#include <vector>

class PerformanceAnalyzer {
public:
    struct Result {
        int vertices;
        int edges;
        double bfsMilliseconds;
        double dfsMilliseconds;
        int injectedCycles;
        int detectedCycles;
        int truePositives;
        int falsePositives;
        int falseNegatives;
        double precision;
        double recall;
        double f1;
    };

    std::vector<Result> runAllConfigurations();
    Result runConfiguration(int vertices, int edges, int cycles, unsigned int seed);
};

#endif
