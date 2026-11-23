#include "JsonValue.h"
#include <cmath>
#include <cstdlib>
#include <iomanip>
#include <sstream>
#include <stdexcept>

namespace {
class Parser {
public:
    explicit Parser(const std::string& text) : input(text), position(0) {}

    JsonValue parse() {
        skipSpace();
        JsonValue value = parseValue();
        skipSpace();
        if (position != input.size()) fail("Unexpected trailing content");
        return value;
    }

private:
    const std::string& input;
    size_t position;

    void fail(const std::string& message) const {
        throw std::runtime_error(message + " at byte " + std::to_string(position));
    }

    void skipSpace() {
        while (position < input.size() &&
               (input[position] == ' ' || input[position] == '\t' ||
                input[position] == '\r' || input[position] == '\n')) ++position;
    }

    bool consume(char expected) {
        skipSpace();
        if (position < input.size() && input[position] == expected) {
            ++position;
            return true;
        }
        return false;
    }

    JsonValue parseValue() {
        skipSpace();
        if (position >= input.size()) fail("Expected a JSON value");
        char ch = input[position];
        if (ch == '{') return parseObject();
        if (ch == '[') return parseArray();
        if (ch == '"') return JsonValue(parseString());
        if (ch == '-' || (ch >= '0' && ch <= '9')) return JsonValue(parseNumber());
        if (input.compare(position, 4, "true") == 0) {
            position += 4;
            return JsonValue(true);
        }
        if (input.compare(position, 5, "false") == 0) {
            position += 5;
            return JsonValue(false);
        }
        if (input.compare(position, 4, "null") == 0) {
            position += 4;
            return JsonValue();
        }
        fail("Invalid JSON value");
        return JsonValue();
    }

    JsonValue parseObject() {
        ++position;
        JsonValue result = JsonValue::object();
        skipSpace();
        if (consume('}')) return result;
        for (;;) {
            skipSpace();
            if (position >= input.size() || input[position] != '"') fail("Expected object key");
            std::string key = parseString();
            if (!consume(':')) fail("Expected ':'");
            result[key] = parseValue();
            if (consume('}')) return result;
            if (!consume(',')) fail("Expected ',' or '}'");
        }
    }

    JsonValue parseArray() {
        ++position;
        JsonValue result = JsonValue::array();
        skipSpace();
        if (consume(']')) return result;
        for (;;) {
            result.pushBack(parseValue());
            if (consume(']')) return result;
            if (!consume(',')) fail("Expected ',' or ']'");
        }
    }

    static void appendUtf8(std::string& out, unsigned int codepoint) {
        if (codepoint <= 0x7f) out.push_back(static_cast<char>(codepoint));
        else if (codepoint <= 0x7ff) {
            out.push_back(static_cast<char>(0xc0 | (codepoint >> 6)));
            out.push_back(static_cast<char>(0x80 | (codepoint & 0x3f)));
        } else if (codepoint <= 0xffff) {
            out.push_back(static_cast<char>(0xe0 | (codepoint >> 12)));
            out.push_back(static_cast<char>(0x80 | ((codepoint >> 6) & 0x3f)));
            out.push_back(static_cast<char>(0x80 | (codepoint & 0x3f)));
        } else {
            out.push_back(static_cast<char>(0xf0 | (codepoint >> 18)));
            out.push_back(static_cast<char>(0x80 | ((codepoint >> 12) & 0x3f)));
            out.push_back(static_cast<char>(0x80 | ((codepoint >> 6) & 0x3f)));
            out.push_back(static_cast<char>(0x80 | (codepoint & 0x3f)));
        }
    }

    unsigned int hex4() {
        if (position + 4 > input.size()) fail("Incomplete unicode escape");
        unsigned int value = 0;
        for (int i = 0; i < 4; ++i) {
            char ch = input[position++];
            value <<= 4;
            if (ch >= '0' && ch <= '9') value |= ch - '0';
            else if (ch >= 'a' && ch <= 'f') value |= ch - 'a' + 10;
            else if (ch >= 'A' && ch <= 'F') value |= ch - 'A' + 10;
            else fail("Invalid unicode escape");
        }
        return value;
    }

    std::string parseString() {
        if (input[position++] != '"') fail("Expected string");
        std::string result;
        while (position < input.size()) {
            char ch = input[position++];
            if (ch == '"') return result;
            if (static_cast<unsigned char>(ch) < 0x20) fail("Control character in string");
            if (ch != '\\') {
                result.push_back(ch);
                continue;
            }
            if (position >= input.size()) fail("Incomplete string escape");
            char escaped = input[position++];
            switch (escaped) {
                case '"': result.push_back('"'); break;
                case '\\': result.push_back('\\'); break;
                case '/': result.push_back('/'); break;
                case 'b': result.push_back('\b'); break;
                case 'f': result.push_back('\f'); break;
                case 'n': result.push_back('\n'); break;
                case 'r': result.push_back('\r'); break;
                case 't': result.push_back('\t'); break;
                case 'u': {
                    unsigned int codepoint = hex4();
                    if (codepoint >= 0xd800 && codepoint <= 0xdbff) {
                        if (position + 2 > input.size() || input[position] != '\\' || input[position + 1] != 'u')
                            fail("Missing low surrogate");
                        position += 2;
                        unsigned int low = hex4();
                        if (low < 0xdc00 || low > 0xdfff) fail("Invalid low surrogate");
                        codepoint = 0x10000 + ((codepoint - 0xd800) << 10) + (low - 0xdc00);
                    } else if (codepoint >= 0xdc00 && codepoint <= 0xdfff) {
                        fail("Unexpected low surrogate");
                    }
                    appendUtf8(result, codepoint);
                    break;
                }
                default: fail("Invalid string escape");
            }
        }
        fail("Unterminated string");
        return result;
    }

    double parseNumber() {
        size_t start = position;
        if (input[position] == '-') ++position;
        if (position >= input.size()) fail("Invalid number");
        if (input[position] == '0') ++position;
        else {
            if (input[position] < '1' || input[position] > '9') fail("Invalid number");
            while (position < input.size() && input[position] >= '0' && input[position] <= '9') ++position;
        }
        if (position < input.size() && input[position] == '.') {
            ++position;
            size_t digits = position;
            while (position < input.size() && input[position] >= '0' && input[position] <= '9') ++position;
            if (digits == position) fail("Invalid number");
        }
        if (position < input.size() && (input[position] == 'e' || input[position] == 'E')) {
            ++position;
            if (position < input.size() && (input[position] == '+' || input[position] == '-')) ++position;
            size_t digits = position;
            while (position < input.size() && input[position] >= '0' && input[position] <= '9') ++position;
            if (digits == position) fail("Invalid number");
        }
        double value = std::strtod(input.substr(start, position - start).c_str(), NULL);
        if (!std::isfinite(value)) fail("Number is out of range");
        return value;
    }
};

std::string escaped(const std::string& input) {
    std::ostringstream out;
    out << '"';
    for (size_t i = 0; i < input.size(); ++i) {
        unsigned char ch = static_cast<unsigned char>(input[i]);
        switch (ch) {
            case '"': out << "\\\""; break;
            case '\\': out << "\\\\"; break;
            case '\b': out << "\\b"; break;
            case '\f': out << "\\f"; break;
            case '\n': out << "\\n"; break;
            case '\r': out << "\\r"; break;
            case '\t': out << "\\t"; break;
            default:
                if (ch < 0x20) out << "\\u" << std::hex << std::setw(4)
                                   << std::setfill('0') << static_cast<int>(ch) << std::dec;
                else out << static_cast<char>(ch);
        }
    }
    out << '"';
    return out.str();
}
}

JsonValue::JsonValue() : valueType(Null), booleanValue(false), numberValue(0) {}
JsonValue::JsonValue(bool value) : valueType(Boolean), booleanValue(value), numberValue(0) {}
JsonValue::JsonValue(double value) : valueType(Number), booleanValue(false), numberValue(value) {}
JsonValue::JsonValue(const std::string& value)
    : valueType(String), booleanValue(false), numberValue(0), stringValue(value) {}
JsonValue::JsonValue(const char* value)
    : valueType(String), booleanValue(false), numberValue(0), stringValue(value) {}
JsonValue JsonValue::array() { JsonValue value; value.valueType = Array; return value; }
JsonValue JsonValue::object() { JsonValue value; value.valueType = Object; return value; }
JsonValue::Type JsonValue::type() const { return valueType; }
bool JsonValue::isNull() const { return valueType == Null; }
bool JsonValue::asBoolean() const { if (valueType != Boolean) throw std::runtime_error("Expected boolean"); return booleanValue; }
double JsonValue::asNumber() const { if (valueType != Number) throw std::runtime_error("Expected number"); return numberValue; }
const std::string& JsonValue::asString() const { if (valueType != String) throw std::runtime_error("Expected string"); return stringValue; }
const std::vector<JsonValue>& JsonValue::asArray() const { if (valueType != Array) throw std::runtime_error("Expected array"); return arrayValue; }
const std::map<std::string, JsonValue>& JsonValue::asObject() const { if (valueType != Object) throw std::runtime_error("Expected object"); return objectValue; }
bool JsonValue::contains(const std::string& key) const { return valueType == Object && objectValue.find(key) != objectValue.end(); }
const JsonValue& JsonValue::at(const std::string& key) const {
    if (valueType != Object || objectValue.find(key) == objectValue.end()) throw std::runtime_error("Missing field: " + key);
    return objectValue.find(key)->second;
}
JsonValue& JsonValue::operator[](const std::string& key) {
    if (valueType != Object) throw std::runtime_error("Expected object");
    return objectValue[key];
}
void JsonValue::pushBack(const JsonValue& value) {
    if (valueType != Array) throw std::runtime_error("Expected array");
    arrayValue.push_back(value);
}
std::string JsonValue::stringify() const {
    std::ostringstream out;
    switch (valueType) {
        case Null: return "null";
        case Boolean: return booleanValue ? "true" : "false";
        case Number: out << std::setprecision(15) << numberValue; return out.str();
        case String: return escaped(stringValue);
        case Array:
            out << '[';
            for (size_t i = 0; i < arrayValue.size(); ++i) {
                if (i) out << ',';
                out << arrayValue[i].stringify();
            }
            out << ']';
            return out.str();
        case Object: {
            out << '{';
            bool first = true;
            for (std::map<std::string, JsonValue>::const_iterator it = objectValue.begin(); it != objectValue.end(); ++it) {
                if (!first) out << ',';
                first = false;
                out << escaped(it->first) << ':' << it->second.stringify();
            }
            out << '}';
            return out.str();
        }
    }
    return "null";
}
JsonValue JsonValue::parse(const std::string& text) { return Parser(text).parse(); }
