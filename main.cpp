#include "MainSystem.h"
#include "JsonMode.h"
#include <iostream>

int main(int argc, char* argv[]) {
    if (argc == 4 && std::string(argv[1]) == "--json") {
        return runJsonMode(argv[2], argv[3]);
    }
    if (argc != 1) {
        std::cerr << "Usage: provenance_engine.exe [--json <input.json> <output.json>]\n";
        return 2;
    }
    MainSystem system;
    system.run();
    return 0;
}
