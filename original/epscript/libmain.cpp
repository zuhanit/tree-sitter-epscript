//
// Created by phu54321 on 2017-01-09.
//

#include "utils.h"
#include "parser/parser.h"
#include <stdexcept>
#include <string.h>
#include <vector>
#include <unordered_set>

extern std::unordered_set<std::string> builtinConstSet;
extern std::unordered_set<std::string> pyKeywordSet;
extern std::unordered_set<std::string> pyBuiltinSet;

extern bool MAP_DEBUG;

extern "C"
{
    void EPS_EXPORT setDebugMode(int set)
    {
        MAP_DEBUG = set != 0;
    }

    void EPS_EXPORT registerPlibConstants(const char *zeroSeparatedStrings)
    {
        const char *p = zeroSeparatedStrings;
        std::vector<std::string> vector;

        do
        {
            std::string globalName(p);
            builtinConstSet.insert(globalName);
            p += globalName.size() + 1;
        } while (*p);
    }

    void EPS_EXPORT registerPyKeywords(const char *zeroSeparatedStrings)
    {
        const char *p = zeroSeparatedStrings;
        std::vector<std::string> vector;

        do
        {
            std::string keywordName(p);
            pyKeywordSet.insert(keywordName);
            p += keywordName.size() + 1;
        } while (*p);
    }

    void EPS_EXPORT registerPyBuiltins(const char *zeroSeparatedStrings)
    {
        const char *p = zeroSeparatedStrings;
        std::vector<std::string> vector;

        do
        {
            std::string builtinName(p);
            pyBuiltinSet.insert(builtinName);
            p += builtinName.size() + 1;
        } while (*p);
    }

    int EPS_EXPORT getErrorCount()
    {
        return getParseErrorNum();
    }

    EPS_EXPORT const char *compileString(
        const char *filename,
        const char *rawcode)
    {
        // Remove \r from code
        std::vector<char> cleanCode;
        cleanCode.reserve(strlen(rawcode) + 1);
        const char *p = rawcode;
        while (*p)
        {
            if (*p != '\r')
                cleanCode.push_back(*p);
            p++;
        }
        std::string code(cleanCode.begin(), cleanCode.end());

        try
        {
            auto parsed = ParseString(filename, code);
            parsed = addStubCode(parsed);
            char *s = new char[parsed.size() + 1];
            memcpy(s, parsed.data(), parsed.size());
            s[parsed.size()] = '\0';
            return s;
        }
        catch (std::runtime_error e)
        {
            fprintf(stderr, "Error occurred : %s\n", e.what());
            return nullptr;
        }
    }

    void EPS_EXPORT freeCompiledResult(const char *str)
    {
        delete[] str;
    }
}

// AST trace export

extern void setShiftCallback(void (*)(const char*, const char*));
extern void setReduceCallback(void (*)(const char*, int));

static std::vector<std::string> gASTEvents;
static std::string gASTResult;

static void onShift(const char* tok, const char* val) {
    std::string s = "{\"t\":\"S\",\"tok\":\"";
    s += tok;
    s += "\",\"val\":\"";
    for (const char* p = val; *p; ++p) {
        if (*p == '"') s += "\\\"";
        else if (*p == '\\') s += "\\\\";
        else if (*p == '\n') s += "\\n";
        else if (*p == '\r') {}
        else s += *p;
    }
    s += "\"}";
    gASTEvents.push_back(s);
}

static void onReduce(const char* rule, int nrhs) {
    std::string s = "{\"t\":\"R\",\"rule\":\"";
    s += rule;
    s += "\",\"nrhs\":";
    s += std::to_string(nrhs);
    s += "}";
    gASTEvents.push_back(s);
}

extern "C" {
    EPS_EXPORT const char* compileStringAST(const char* filename, const char* rawcode) {
        gASTEvents.clear();
        setShiftCallback(onShift);
        setReduceCallback(onReduce);

        std::vector<char> cleanCode;
        const char* p = rawcode;
        while (*p) {
            if (*p != '\r') cleanCode.push_back(*p);
            ++p;
        }
        std::string code(cleanCode.begin(), cleanCode.end());

        try {
            ParseString(filename, code, false);
        } catch (...) {}

        setShiftCallback(nullptr);
        setReduceCallback(nullptr);

        gASTResult = "[";
        for (size_t i = 0; i < gASTEvents.size(); ++i) {
            if (i > 0) gASTResult += ",";
            gASTResult += gASTEvents[i];
        }
        gASTResult += "]";
        return gASTResult.c_str();
    }
}
