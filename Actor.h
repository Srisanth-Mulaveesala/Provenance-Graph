#ifndef ACTOR_H
#define ACTOR_H

#include <string>

class Actor {
private:
    int actorID;
    std::string actorName;
    std::string actorType;

public:
    Actor(int id = -1, const std::string& name = "", const std::string& type = "");

    int getActorID() const;
    const std::string& getActorName() const;
    const std::string& getActorType() const;

    void setActorName(const std::string& name);
    void setActorType(const std::string& type);
};

#endif
