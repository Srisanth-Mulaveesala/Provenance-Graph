#include "Actor.h"

Actor::Actor(int id, const std::string& name, const std::string& type)
    : actorID(id), actorName(name), actorType(type) {}

int Actor::getActorID() const { return actorID; }
const std::string& Actor::getActorName() const { return actorName; }
const std::string& Actor::getActorType() const { return actorType; }
void Actor::setActorName(const std::string& name) { actorName = name; }
void Actor::setActorType(const std::string& type) { actorType = type; }
