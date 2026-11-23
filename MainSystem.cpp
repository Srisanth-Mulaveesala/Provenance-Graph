#include "MainSystem.h"
#include <iostream>
#include <limits>

MainSystem::MainSystem() : hasGeneratedData(false) {}

void MainSystem::displayMenu() const {
    std::cout << "\n========================================\n";
    std::cout << "       PROVENANCE GRAPH SYSTEM\n";
    std::cout << "========================================\n";
    std::cout << "1. Add Supply Chain Actor\n";
    std::cout << "2. Add Product Transfer Event\n";
    std::cout << "3. Display Provenance Graph\n";
    std::cout << "4. Trace Upstream Origins (BFS)\n";
    std::cout << "5. Detect Fraudulent Cycles (DFS)\n";
    std::cout << "6. Generate Synthetic Supply Chain Data\n";
    std::cout << "7. Run Performance Analysis\n";
    std::cout << "8. Display Algorithm Complexity\n";
    std::cout << "9. Exit\n";
    std::cout << "========================================\n";
}

int MainSystem::readInteger(const std::string& prompt) {
    int value;
    for (;;) {
        std::cout << prompt;
        if (std::cin >> value) {
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            return value;
        }
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
        std::cout << "Invalid input. Please enter a whole number.\n";
    }
}

std::string MainSystem::readLine(const std::string& prompt) {
    std::string value;
    std::cout << prompt;
    std::getline(std::cin, value);
    return value;
}

void MainSystem::addActor() {
    int id = readInteger("Enter actor ID (non-negative integer): ");
    if (id < 0) {
        std::cout << "Actor ID must be non-negative.\n";
        return;
    }
    if (graph.actorExists(id)) {
        std::cout << "An actor with this ID already exists.\n";
        return;
    }
    std::string name = readLine("Enter actor name: ");
    if (name.empty()) name = "Actor " + std::to_string(id);
    std::string type = readLine("Enter actor type (Supplier/Manufacturer/Distributor/Pharmacy/Customer): ");
    if (type.empty()) type = "Supply Chain Actor";
    if (graph.addActor(Actor(id, name, type))) {
        std::cout << "Actor added successfully.\n";
    }
}

void MainSystem::addTransfer() {
    int source = readInteger("Enter source actor ID: ");
    int destination = readInteger("Enter destination actor ID: ");
    int product = readInteger("Enter product ID: ");
    if (!graph.actorExists(source) || !graph.actorExists(destination)) {
        std::cout << "Invalid actor ID. Both actors must exist first.\n";
        return;
    }
    if (graph.addTransfer(source, destination, product)) {
        std::cout << "Product transfer added successfully.\n";
    } else {
        std::cout << "Duplicate transfer ignored. The directed edge already exists.\n";
    }
}

void MainSystem::traceOrigins() {
    if (graph.getVertexCount() == 0) {
        std::cout << "\nThe provenance graph is empty.\n";
        return;
    }
    int id = readInteger("Enter the actor ID to trace upstream: ");
    BFSAnalyzer analyzer;
    analyzer.displayUpstream(graph, id);
}

void MainSystem::detectCycles() {
    CycleDetector detector;
    detector.displayCycles(graph);
}

void MainSystem::generateSyntheticData() {
    int vertices = readInteger("Enter number of vertices (1-10000): ");
    int edges = readInteger("Enter number of edges (0-50000): ");
    int cycles = readInteger("Enter number of cycles to inject: ");

    if (vertices < 1 || vertices > 10000 ||
        edges < 0 || edges > 50000 || cycles < 0 ||
        cycles > vertices / 3 || edges < vertices - 1 + cycles ||
        (vertices == 1 && edges != 0)) {
        std::cout << "Invalid synthetic-data parameters. Require at most floor(vertices/3) cycles and at least vertices-1+cycles edges.\n";
        return;
    }
    unsigned int seed = static_cast<unsigned int>(readInteger("Enter random seed (integer): "));
    SyntheticDataGenerator generator;
    latestGroundTruth = generator.generate(graph, vertices, edges, cycles, seed);
    hasGeneratedData = true;
    std::cout << "Ground-truth cycles stored: " << latestGroundTruth.injectedCycles.size() << "\n";
}

void MainSystem::runPerformanceAnalysis() {
    PerformanceAnalyzer analyzer;
    analyzer.runAllConfigurations();
}

void MainSystem::displayComplexity() const {
    std::cout << "\nALGORITHM COMPLEXITY\n";
    std::cout << "Operation                 Time Complexity    Space Complexity\n";
    std::cout << "------------------------  -----------------  ----------------\n";
    std::cout << "Graph Construction        O(V + E)           O(V + E)\n";
    std::cout << "Reverse BFS (upstream)    O(V + E)           O(V)\n";
    std::cout << "Three-colour DFS          O(V + E)           O(V)\n";
    std::cout << "Graph Display             O(V + E)           O(V)\n";
    std::cout << "Cycle Reconstruction      O(V) per back edge O(V)\n";
    std::cout << "\nV = number of actors; E = number of directed transfer edges.\n";
    std::cout << "Detected cycles are treated as suspicious patterns, not proof of fraud.\n";
}

void MainSystem::run() {
    while (true) {
        displayMenu();
        int choice = readInteger("Enter your choice: ");
        switch (choice) {
            case 1: addActor(); break;
            case 2: addTransfer(); break;
            case 3: graph.display(); break;
            case 4: traceOrigins(); break;
            case 5: detectCycles(); break;
            case 6: generateSyntheticData(); break;
            case 7: runPerformanceAnalysis(); break;
            case 8: displayComplexity(); break;
            case 9:
                std::cout << "\nExiting Provenance Graph System. Goodbye!\n";
                return;
            default:
                std::cout << "\nInvalid menu choice. Please select 1-9.\n";
        }
    }
}
