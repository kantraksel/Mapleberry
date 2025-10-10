#include <format>
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#if _DEBUG
	#include <comdef.h>
#endif
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

#if _DEBUG
std::string StringUtils::Format(HRESULT hr)
{
	if (hr == E_FAIL)
		return std::format("{:X} - Unknown error", hr);

	_com_error err(hr);
	auto str = StringUtils::WideStringToUtf8(err.ErrorMessage());
	return std::format("{:X} - {}", hr, str);
}

std::wstring StringUtils::FormatW(HRESULT hr)
{
	if (hr == E_FAIL)
		return std::format(L"{:X} - Unknown error", hr);

	_com_error err(hr);
	return std::format(L"{:X} - {}", hr, err.ErrorMessage());
}
#endif
