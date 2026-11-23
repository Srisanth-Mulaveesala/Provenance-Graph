#ifndef JSON_VALUE_H
#define JSON_VALUE_H

#include <map>
#include <string>
#include <vector>

class JsonValue {
public:
    enum Type { Null, Boolean, Number, String, Array, Object };

    JsonValue();
    explicit JsonValue(bool value);
    explicit JsonValue(double value);
    explicit JsonValue(const std::string& value);
    explicit JsonValue(const char* value);

    static JsonValue array();
    static JsonValue object();

    Type type() const;
    bool isNull() const;
    bool asBoolean() const;
    double asNumber() const;
    const std::string& asString() const;
    const std::vector<JsonValue>& asArray() const;
    const std::map<std::string, JsonValue>& asObject() const;
    bool contains(const std::string& key) const;
    const JsonValue& at(const std::string& key) const;
    JsonValue& operator[](const std::string& key);
    void pushBack(const JsonValue& value);
    std::string stringify() const;
    static JsonValue parse(const std::string& text);

private:
    Type valueType;
    bool booleanValue;
    double numberValue;
    std::string stringValue;
    std::vector<JsonValue> arrayValue;
    std::map<std::string, JsonValue> objectValue;
};

#endif
