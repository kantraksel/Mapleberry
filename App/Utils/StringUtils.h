#pragma once
#include <string>

namespace StringUtils
{
    std::wstring Utf8ToWideString(const std::string_view& str);
    std::string WideStringToUtf8(const std::wstring_view& str);

#ifdef _HRESULT_DEFINED
#if _DEBUG
	std::string Format(HRESULT hr);
	std::wstring FormatW(HRESULT hr);
#else
	inline std::string Format(HRESULT hr)
	{
		return std::format("{:X}", hr);
	}
	inline std::wstring FormatW(HRESULT hr)
	{
		return std::format(L"{:X}", hr);
	}
#endif
#endif
}
