# PROJECT SPECIFICATION (specs.md)

## 1. Project Title

**Provenance Graph: Tracing Origin and Detecting Fraudulent Loops**

## 2. Project Overview

Develop a menu-driven C++ application that uses Directed Graphs to track the movement of products across different supply chain actors, including suppliers, manufacturers, distributors, pharmacies, and customers.

Each product transfer is represented as a directed edge between two actors.

The system must trace the complete upstream origin of a product and detect suspicious circular transfers that may indicate product laundering, illegal relabelling, or fraudulent supply-chain activities.

The project must demonstrate the practical implementation of Design and Analysis of Algorithms (DAA) concepts.

## 3. Primary Objectives

1. Construct a directed graph using a list of product transfer events.
2. Implement Breadth First Search (BFS) to identify all upstream ancestors of a selected actor or product.
3. Implement Depth First Search (DFS) with three-colour marking to detect cycles in directed graphs.
4. Identify and display the complete path of detected cycles.
5. Generate synthetic supply-chain networks with intentionally injected cycles.
6. Measure algorithm execution time and evaluate cycle detection accuracy.
7. Analyse the time and space complexity of the implemented algorithms.

## 4. Technology Requirements

- Programming Language: C++
- Compiler: GCC / MinGW
- IDE: Visual Studio Code / Code::Blocks
- Graph Representation: Adjacency List
- BFS Implementation: Queue
- DFS Implementation: Recursion or iterative stack
- Execution Time Measurement: chrono library
- Data Storage: In-memory data structures and optional text-file input/output.

Use standard C++ libraries.

Avoid unnecessary external libraries and frameworks.

## 5. Supply Chain Graph Model

Represent the supply chain as a Directed Graph.

### Vertices

Each vertex represents a supply-chain actor.

Examples:
- Supplier
- Manufacturer
- Distributor
- Pharmacy
- Customer

Each actor must have a unique ID and a name.

### Directed Edges

Each directed edge represents a product transfer.

Example:

Supplier A → Manufacturer B

This indicates that Supplier A transferred a product to Manufacturer B.

### Example Graph

Supplier A → Manufacturer B
Manufacturer B → Distributor C
Distributor C → Pharmacy D
Pharmacy D → Customer E

The graph must support multiple outgoing and incoming edges.

## 6. Functional Requirements

### Module 1: Graph Construction

Implement graph construction using an adjacency list.

Requirements:

- Add new supply-chain actors.
- Add product transfer events.
- Store source and destination actor IDs.
- Display all actors and their outgoing transfers.
- Support multiple transfer events.
- Validate actor IDs before adding an edge.
- Prevent invalid or duplicate transfer entries where appropriate.

### Module 2: Upstream Origin Tracking (BFS)

Implement Breadth First Search to trace the upstream history of a selected actor.

Important implementation requirement:

Since graph edges represent forward product transfers, BFS must traverse incoming edges to identify upstream actors.

Maintain an incoming adjacency list or reverse graph.

Algorithm:

1. Accept an actor ID as input.
2. Initialize a queue.
3. Mark the selected actor as visited.
4. Insert the selected actor into the queue.
5. Remove one actor from the queue.
6. Visit all its incoming neighbours.
7. Mark unvisited neighbours as visited.
8. Insert them into the queue.
9. Continue until the queue becomes empty.
10. Display all discovered upstream ancestors.

Expected output:

Selected Actor: Pharmacy D

Upstream Ancestors:
1. Distributor C
2. Manufacturer B
3. Supplier A

Display the total number of upstream ancestors.

Time Complexity: O(V + E)

Space Complexity: O(V)

### Module 3: Fraud Detection Using DFS

Implement directed cycle detection using Depth First Search with three-colour marking.

Colour Representation:

- WHITE (0): Unvisited vertex.
- GREY (1): Currently being explored.
- BLACK (2): Completely explored vertex.

Algorithm:

1. Initialize all vertices as WHITE.
2. Select an unvisited vertex.
3. Change its colour to GREY.
4. Explore its adjacent vertices.
5. If an adjacent vertex is WHITE, recursively visit it.
6. If an adjacent vertex is GREY, a back edge has been detected.
7. A back edge indicates a directed cycle.
8. After exploring all adjacent vertices, change the current vertex to BLACK.
9. Continue until all vertices have been processed.

Important requirements:

- Detect directed cycles.
- Display the complete cycle path.
- Detect multiple cycles where possible.
- Handle disconnected graph components.
- Avoid reporting ordinary forward or cross edges as cycles.
- Clearly distinguish between a cycle and a valid supply-chain path.

Example:

Manufacturer B → Distributor C
Distributor C → Pharmacy D
Pharmacy D → Manufacturer B

Expected output:

FRAUDULENT CYCLE DETECTED!

Cycle Path:
Manufacturer B
    ↓
Distributor C
    ↓
Pharmacy D
    ↓
Manufacturer B

Time Complexity: O(V + E)

Space Complexity: O(V)

Note: A detected cycle must be classified as a suspicious transaction pattern, not definitive proof of fraud.

### Module 4: Synthetic Data Generation

Develop a synthetic supply-chain graph generator.

Requirements:

- Generate a specified number of actors.
- Generate directed transfer events.
- Create valid supply-chain chains.
- Introduce multiple branches.
- Inject intentionally created directed cycles.
- Maintain information about the injected cycles.
- Generate datasets of different sizes.

Suggested test configurations:

| Dataset | Vertices | Edges | Injected Cycles |
|---|---:|---:|---:|
| Small | 100 | 150 | 2 |
| Medium | 500 | 750 | 5 |
| Large | 1000 | 1500 | 10 |
| Extra Large | 5000 | 7500 | 20 |

Ensure that the generated graph contains the intended number of injected cycles.

Use reproducible random seeds for testing.

### Module 5: Performance Analysis

Measure BFS and DFS execution time using the C++ chrono library.

Record:

- Number of vertices.
- Number of edges.
- BFS execution time.
- DFS execution time.
- Number of injected cycles.
- Number of cycles detected.
- Detection accuracy.

Use milliseconds or microseconds consistently.

Calculate detection metrics:

True Positive (TP):
Injected cycles correctly detected.

False Positive (FP):
Reported cycles that were not injected.

False Negative (FN):
Injected cycles that were not detected.

Precision:

Precision = TP / (TP + FP)

Recall:

Recall = TP / (TP + FN)

F1 Score:

F1 = 2 × (Precision × Recall) / (Precision + Recall)

Handle division by zero safely.

Important:
Compare injected cycles and detected cycles using their actual vertex sequences, rather than comparing only their counts.

For multiple-cycle detection, clearly document whether the implementation reports unique elementary cycles or detected back-edge cycles. Use a consistent definition when calculating metrics.

Display performance results in a formatted table.

## 7. Main Menu Interface

Create a user-friendly, menu-driven interface.

Expected menu:

========================================
       PROVENANCE GRAPH SYSTEM
========================================

1. Add Supply Chain Actor
2. Add Product Transfer Event
3. Display Provenance Graph
4. Trace Upstream Origins (BFS)
5. Detect Fraudulent Cycles (DFS)
6. Generate Synthetic Supply Chain Data
7. Run Performance Analysis
8. Display Algorithm Complexity
9. Exit

Enter your choice:

Each menu option must perform its corresponding operation.

Validate user inputs and handle invalid menu choices.

## 8. Sample Test Case

### Normal Supply Chain

Input:

Supplier A → Manufacturer B
Manufacturer B → Distributor C
Distributor C → Pharmacy D
Pharmacy D → Customer E

Expected result:

BFS from Customer E:

Pharmacy D
Distributor C
Manufacturer B
Supplier A

DFS Result:

No directed cycles detected.

### Fraudulent Supply Chain

Input:

Supplier A → Manufacturer B
Manufacturer B → Distributor C
Distributor C → Pharmacy D
Pharmacy D → Manufacturer B

Expected result:

DFS Result:

SUSPICIOUS CIRCULAR TRANSFER DETECTED!

Manufacturer B → Distributor C → Pharmacy D → Manufacturer B

## 9. Non-Functional Requirements

- Code must be modular and readable.
- Use meaningful variable and function names.
- Implement BFS and DFS manually.
- Use an adjacency list for graph representation.
- Include comments explaining important algorithmic operations.
- Handle disconnected graphs.
- Handle empty graphs.
- Validate all user inputs.
- Avoid unnecessary code duplication.
- Ensure that the program does not crash for invalid inputs.
- Keep the implementation suitable for an academic DAA project.

## 10. Suggested C++ Class Structure

### Class: Actor

Attributes:
- actorID
- actorName
- actorType

### Class: Transfer

Attributes:
- sourceID
- destinationID
- productID

### Class: ProvenanceGraph

Responsibilities:
- Store actors.
- Store transfer events.
- Maintain adjacency lists.
- Add actors and transfers.
- Display graph information.

### Class: BFSAnalyzer

Responsibilities:
- Perform reverse BFS.
- Identify upstream ancestors.
- Display upstream traversal results.

### Class: CycleDetector

Responsibilities:
- Implement three-colour DFS.
- Detect directed cycles.
- Reconstruct and display cycle paths.
- Report cycle detection results.

### Class: SyntheticDataGenerator

Responsibilities:
- Generate synthetic actors.
- Generate transfer events.
- Inject known cycles.
- Maintain ground-truth cycle information.

### Class: PerformanceAnalyzer

Responsibilities:
- Measure BFS execution time.
- Measure DFS execution time.
- Calculate precision, recall, and F1 score.
- Display performance comparison.

### Class: MainSystem

Responsibilities:
- Display the menu.
- Accept user input.
- Coordinate all modules.
- Display final results.

## 11. Expected Project Output

The completed application must demonstrate:

1. Successful construction of a directed provenance graph.
2. Successful addition and display of supply-chain transfer events.
3. Correct identification of upstream ancestors using BFS.
4. Correct detection of directed cycles using three-colour DFS.
5. Display of complete detected cycle paths.
6. Successful generation of synthetic datasets.
7. Accurate comparison between injected and detected cycles.
8. Execution-time measurement for BFS and DFS.
9. Time and space complexity analysis.

## 12. DAA Complexity Analysis

Include the following complexity table in the project documentation.

| Operation | Time Complexity |
|---|---|
| Graph Construction | O(V + E) |
| BFS | O(V + E) |
| DFS Cycle Detection | O(V + E) |
| Graph Display | O(V + E) |
| Performance Measurement | Depends on graph size and repetitions |

Where:

V = Number of vertices.

E = Number of directed edges.

## 13. Instructions for GitHub Copilot

Follow these instructions strictly while developing the project:

1. Read and understand the complete specification before generating code.
2. Implement the project in C++.
3. Follow the modular class structure.
4. Implement actual BFS and DFS algorithms instead of using predefined graph libraries.
5. Use three-colour DFS for directed cycle detection.
6. Use reverse adjacency lists for upstream BFS.
7. Ensure cycle paths are reconstructed correctly.
8. Support disconnected graphs and multiple detected cycles.
9. Implement synthetic data generation with known ground-truth cycles.
10. Implement meaningful performance measurements.
11. Ensure that precision, recall, and F1 score are calculated correctly.
12. Use meaningful comments and proper formatting.
13. Do not generate incomplete functions or placeholder implementations.
14. Do not hardcode sample outputs.
15. Ensure that every menu option works correctly.
16. Compile and test the complete program.
17. Fix compilation errors and logical errors before considering the project complete.

## 14. Final Deliverables

Generate the following project files:

1. main.cpp – Main application entry point.
2. Actor.h – Actor class declaration.
3. Transfer.h – Transfer event declaration.
4. ProvenanceGraph.h – Directed graph implementation.
5. BFSAnalyzer.h – Upstream BFS implementation.
6. CycleDetector.h – Three-colour DFS implementation.
7. SyntheticDataGenerator.h – Synthetic graph generation.
8. PerformanceAnalyzer.h – Runtime and accuracy analysis.
9. README.md – Project description, compilation instructions, and usage guide.
10. specs.md – Complete project specifications.

If implementation files are separated, generate the corresponding .cpp files as required.

The final application must compile successfully and demonstrate every feature described in this specification.