#pragma once
#include <string>

namespace StringUtils
{
    std::wstring Utf8ToWideString(const std::string_view& str);
    std::string WideStringToUtf8(const std::wstring_view& str);
}
