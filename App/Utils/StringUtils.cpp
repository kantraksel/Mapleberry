#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include "StringUtils.h"

std::wstring StringUtils::Utf8ToWideString(const std::string_view& str)
{
	std::wstring out;

	auto length = MultiByteToWideChar(CP_UTF8, 0, str.data(), (int)str.size(), nullptr, 0);
	if (length != 0)
	{
		out.resize(length);
		length = MultiByteToWideChar(CP_UTF8, 0, str.data(), (int)str.size(), out.data(), (int)out.size());
	}

	if (length == 0)
	{
		out.clear();
		out.reserve(str.size());
		for (char ch : str)
		{
			out.push_back((wchar_t)ch);
		}
	}

	return out;
}

std::string StringUtils::WideStringToUtf8(const std::wstring_view& str)
{
	std::string out;

	auto length = WideCharToMultiByte(CP_UTF8, 0, str.data(), (int)str.length(), nullptr, 0, NULL, NULL);
	if (length != 0)
	{
		out.resize(length);
		length = WideCharToMultiByte(CP_UTF8, 0, str.data(), (int)str.length(), out.data(), (int)out.size(), NULL, NULL);
	}

	if (length == 0)
	{
		out.clear();
		out.reserve(str.size());
		for (wchar_t ch : str)
		{
			out.push_back((char)ch);
		}
	}

	return out;
}
