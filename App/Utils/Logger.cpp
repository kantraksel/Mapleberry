#include <chrono>
#include <functional>
#include <fstream>
#include <iostream>
#include <mutex>
#ifdef _WIN32
	#define WIN32_LEAN_AND_MEAN
	#include <Windows.h>
#endif
#if _DEBUG
	#include <comdef.h>
#endif
#define LOGGER_ENABLE_CALLBACK
#include "Logger.h"
#include "StringUtils.h"

enum Color : char
{
	Black = '0',
	Red,
	Green,
	Yellow,
	Blue,
	Magenta,
	Cyan,
	White,
};

using LogLevel = Logger::LogLevel;

struct LoggerImpl
{
	std::ofstream file;
	std::mutex mutex;
	std::function<void(const std::string&, LogLevel level)> logCallback;
	bool timestampEnabled;

	LoggerImpl();
	void LogRaw(const std::string&, Color, LogLevel);

	void OpenLogFile(const std::wstring& name);
	void Log(const std::string_view& str, LogLevel level);
};

static LoggerImpl instance;

LoggerImpl::LoggerImpl()
{
	timestampEnabled = true;
#if _DEBUG && _WIN32
	auto hOut = GetStdHandle(STD_OUTPUT_HANDLE);
	if (hOut == NULL && AllocConsole())
	{
		FILE* fDummy;
		freopen_s(&fDummy, "CONIN$", "r", stdin);
		freopen_s(&fDummy, "CONOUT$", "w", stderr);
		freopen_s(&fDummy, "CONOUT$", "w", stdout);
	}
	SetConsoleCP(CP_UTF8);
	SetConsoleOutputCP(CP_UTF8);

	DWORD mode = 0;
	hOut = GetStdHandle(STD_OUTPUT_HANDLE);
	GetConsoleMode(hOut, &mode);
	SetConsoleMode(hOut, mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);

	std::cin.clear();
	std::cout.clear();
	std::cerr.clear();
#endif
}

void LoggerImpl::OpenLogFile(const std::wstring& name)
{
	std::lock_guard lock(mutex);

	file.close();
	file.open(name, std::ofstream::app);

	auto const time = std::chrono::current_zone()->to_local(std::chrono::system_clock::now());
	auto out = std::format("Starting logger - {:%c}", time);
	LogRaw(out, Color::Green, LogLevel::OpenLogFile);
}

void LoggerImpl::LogRaw(const std::string& out, Color fontColor, LogLevel level)
{
	if (file)
	{
		file << out << std::endl;
		file.flush();
	}

#if _DEBUG
	static char color[] = "\x1b[37;40m";
	color[3] = fontColor;
	color[6] = Color::Black;
	std::cout << color << out << std::endl;
#endif

	if (logCallback)
		logCallback(out, level);
}

static const char* GetColor(LogLevel level, Color& color)
{
	switch (level)
	{
		case LogLevel::Debug:
		{
			color = Color::Cyan;
			return "";
		}
		case LogLevel::Info:
		{
			color = Color::White;
			return "";
		}
		case LogLevel::Warning:
		{
			color = Color::Yellow;
			return "[Warning] ";
		}
		case LogLevel::Error:
		{
			color = Color::Red;
			return "[ERROR] ";
		}
		default:
		{
			color = Color::White;
			return "";
		}
	}
}

void LoggerImpl::Log(const std::string_view& str, LogLevel level)
{
	Color color;
	auto* levelPrefix = GetColor(level, color);

	std::string out;
	if (timestampEnabled)
	{
		auto const time = std::chrono::current_zone()->to_local(std::chrono::system_clock::now());
		out = std::format("[{:%X}] {}{}", time, levelPrefix, str.data());
	}
	else
		out = std::format("{}{}", levelPrefix, str.data());

	std::lock_guard lock(mutex);
	LogRaw(out, color, level);
}

// public Logger
void Logger::OpenLogFile(const std::wstring& name)
{
	instance.OpenLogFile(name);
}

bool Logger::IsLogOpened()
{
	return (bool)instance.file;
}

void Logger::SetTitle(const std::string_view& title)
{
#if _DEBUG
	std::cout << "\x1b]0;" << title << "\x1b\x5c";
#endif
}

void Logger::DisableTimestamp()
{
	instance.timestampEnabled = false;
}

void Logger::EnableTimestamp()
{
	instance.timestampEnabled = true;
}

void Logger::Log(const std::string_view& str)
{
	instance.Log(str, LogLevel::Info);
}

void Logger::Log(const std::wstring_view& str)
{
	instance.Log(StringUtils::WideStringToUtf8(str), LogLevel::Info);
}

void Logger::LogWarn(const std::string_view& str)
{
	instance.Log(str, LogLevel::Warning);
}

void Logger::LogWarn(const std::wstring_view& str)
{
	instance.Log(StringUtils::WideStringToUtf8(str), LogLevel::Warning);
}

void Logger::LogError(const std::string_view& str)
{
	instance.Log(str, LogLevel::Error);
}

void Logger::LogError(const std::wstring_view& str)
{
	instance.Log(StringUtils::WideStringToUtf8(str), LogLevel::Error);
}

#if _DEBUG
void Logger::LogDebug(const std::string_view& str)
{
	instance.Log(str, LogLevel::Debug);
}

void Logger::LogDebug(const std::wstring_view& str)
{
	instance.Log(StringUtils::WideStringToUtf8(str), LogLevel::Debug);
}

std::string Logger::Format(HRESULT hr)
{
	if (hr == E_FAIL)
		return std::format("{:X} - Unknown error", hr);

	_com_error err(hr);
	auto str = StringUtils::WideStringToUtf8(err.ErrorMessage());
	return std::format("{:X} - {}", hr, str);
}

std::wstring Logger::FormatW(HRESULT hr)
{
	if (hr == E_FAIL)
		return std::format(L"{:X} - Unknown error", hr);

	_com_error err(hr);
	return std::format(L"{:X} - {}", hr, err.ErrorMessage());
}
#endif

void Logger::SetLogCallback(const std::function<void(const std::string&, LogLevel level)>& callback)
{
	instance.logCallback = callback;
}

std::function<void(const std::string&, LogLevel level)> Logger::GetLogCallback()
{
	return instance.logCallback;
}
