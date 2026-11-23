#ifndef PROVENANCE_GRAPH_H
#define PROVENANCE_GRAPH_H

#include "Actor.h"
#include "Transfer.h"
#include <map>
#include <set>
#include <tuple>
#include <vector>

class ProvenanceGraph {
private:
    std::map<int, Actor> actors;
    std::vector<Transfer> transfers;
    std::map<int, std::vector<int>> adjacencyList;
    std::map<int, std::vector<int>> reverseAdjacencyList;
    std::map<int, std::vector<Transfer>> incomingTransfers;
    std::set<std::tuple<int, int, int>> transferSet;

public:
    bool addActor(const Actor& actor);
    bool actorExists(int actorID) const;
    bool addTransfer(int sourceID, int destinationID, int productID);
    bool hasEdge(int sourceID, int destinationID) const;

    void clear();
    void display() const;

    size_t getVertexCount() const;
    size_t getEdgeCount() const;
    const Actor& getActor(int actorID) const;
    const std::vector<int>& getOutgoing(int actorID) const;
    const std::vector<int>& getIncoming(int actorID) const;
    const std::vector<Transfer>& getIncomingTransfers(int actorID) const;
    const std::map<int, Actor>& getActors() const;
    const std::vector<Transfer>& getTransfers() const;

    std::vector<int> getActorIDs() const;
};

#endif
