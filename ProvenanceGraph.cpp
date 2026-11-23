#include "ProvenanceGraph.h"
#include <algorithm>
#include <iostream>

bool ProvenanceGraph::addActor(const Actor& actor) {
    int id = actor.getActorID();
    if (id < 0 || actors.find(id) != actors.end()) {
        return false;
    }
    actors[id] = actor;
    adjacencyList[id] = std::vector<int>();
    reverseAdjacencyList[id] = std::vector<int>();
    incomingTransfers[id] = std::vector<Transfer>();
    return true;
}

bool ProvenanceGraph::actorExists(int actorID) const {
    return actors.find(actorID) != actors.end();
}

bool ProvenanceGraph::addTransfer(int sourceID, int destinationID, int productID) {
    if (!actorExists(sourceID) || !actorExists(destinationID)) {
        return false;
    }
    std::tuple<int, int, int> transferKey(sourceID, destinationID, productID);
    if (transferSet.find(transferKey) != transferSet.end()) {
        return false;
    }

    transferSet.insert(transferKey);
    transfers.push_back(Transfer(sourceID, destinationID, productID));
    adjacencyList[sourceID].push_back(destinationID);
    reverseAdjacencyList[destinationID].push_back(sourceID);
    incomingTransfers[destinationID].push_back(Transfer(sourceID, destinationID, productID));
    return true;
}

bool ProvenanceGraph::hasEdge(int sourceID, int destinationID) const {
    std::map<int, std::vector<int>>::const_iterator it = adjacencyList.find(sourceID);
    return it != adjacencyList.end() &&
        std::find(it->second.begin(), it->second.end(), destinationID) != it->second.end();
}

void ProvenanceGraph::clear() {
    actors.clear();
    transfers.clear();
    adjacencyList.clear();
    reverseAdjacencyList.clear();
    incomingTransfers.clear();
    transferSet.clear();
}

void ProvenanceGraph::display() const {
    if (actors.empty()) {
        std::cout << "\nThe provenance graph is empty.\n";
        return;
    }
    std::cout << "\nPROVENANCE GRAPH\n";
    std::cout << "Vertices: " << actors.size() << "  Edges: " << transfers.size() << "\n";
    for (std::map<int, Actor>::const_iterator it = actors.begin(); it != actors.end(); ++it) {
        int id = it->first;
        std::cout << "[" << id << "] " << it->second.getActorName()
                  << " (" << it->second.getActorType() << ") -> ";
        const std::vector<int>& out = adjacencyList.at(id);
        if (out.empty()) {
            std::cout << "none";
        } else {
            for (size_t i = 0; i < out.size(); ++i) {
                if (i > 0) std::cout << ", ";
                std::cout << out[i];
            }
        }
        std::cout << "\n";
    }
}

size_t ProvenanceGraph::getVertexCount() const { return actors.size(); }
size_t ProvenanceGraph::getEdgeCount() const { return transfers.size(); }

const Actor& ProvenanceGraph::getActor(int actorID) const {
    static Actor invalid;
    std::map<int, Actor>::const_iterator it = actors.find(actorID);
    return it == actors.end() ? invalid : it->second;
}

const std::vector<int>& ProvenanceGraph::getOutgoing(int actorID) const {
    static const std::vector<int> empty;
    std::map<int, std::vector<int>>::const_iterator it = adjacencyList.find(actorID);
    return it == adjacencyList.end() ? empty : it->second;
}

const std::vector<int>& ProvenanceGraph::getIncoming(int actorID) const {
    static const std::vector<int> empty;
    std::map<int, std::vector<int>>::const_iterator it = reverseAdjacencyList.find(actorID);
    return it == reverseAdjacencyList.end() ? empty : it->second;
}

const std::vector<Transfer>& ProvenanceGraph::getIncomingTransfers(int actorID) const {
    static const std::vector<Transfer> empty;
    std::map<int, std::vector<Transfer>>::const_iterator it = incomingTransfers.find(actorID);
    return it == incomingTransfers.end() ? empty : it->second;
}

const std::map<int, Actor>& ProvenanceGraph::getActors() const { return actors; }
const std::vector<Transfer>& ProvenanceGraph::getTransfers() const { return transfers; }

std::vector<int> ProvenanceGraph::getActorIDs() const {
    std::vector<int> ids;
    for (std::map<int, Actor>::const_iterator it = actors.begin(); it != actors.end(); ++it) {
        ids.push_back(it->first);
    }
    return ids;
}
