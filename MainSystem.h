#ifndef MAIN_SYSTEM_H
#define MAIN_SYSTEM_H

#include "ProvenanceGraph.h"
#include "BFSAnalyzer.h"
#include "CycleDetector.h"
#include "SyntheticDataGenerator.h"
#include "PerformanceAnalyzer.h"

class MainSystem {
private:
    ProvenanceGraph graph;
    SyntheticDataGenerator::GroundTruth latestGroundTruth;
    bool hasGeneratedData;

    void displayMenu() const;
    int readInteger(const std::string& prompt);
    std::string readLine(const std::string& prompt);
    void addActor();
    void addTransfer();
    void traceOrigins();
    void detectCycles();
    void generateSyntheticData();
    void runPerformanceAnalysis();
    void displayComplexity() const;

public:
    MainSystem();
    void run();
};

#endif
