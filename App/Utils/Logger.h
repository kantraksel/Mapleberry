#pragma once
#include <format>
#ifdef LOGGER_ENABLE_CALLBACK
#include <functional>
#endif

namespace Logger
{
	void OpenLogFile(const std::wstring& name);
	bool IsLogOpened();
	void SetTitle(const std::string_view& title);
	void DisableTimestamp();
	void EnableTimestamp();

	void Log(const std::string_view& str);
	void Log(const std::wstring_view& str);
	void LogWarn(const std::string_view& str);
	void LogWarn(const std::wstring_view& str);
	void LogError(const std::string_view& str);
	void LogError(const std::wstring_view& str);

	template <class... Args>
	inline void Log(const std::format_string<Args...> fmt, Args&&... _Args)
	{
		Log(std::vformat(fmt.get(), std::make_format_args(_Args...)));
	}

	template <class... Args>
	inline void Log(const std::wformat_string<Args...> fmt, Args&&... _Args)
	{
		Log(std::vformat(fmt.get(), std::make_wformat_args(_Args...)));
	}

	template <class... Args>
	inline void LogWarn(const std::format_string<Args...> fmt, Args&&... _Args)
	{
		LogWarn(std::vformat(fmt.get(), std::make_format_args(_Args...)));
	}

	template <class... Args>
	inline void LogWarn(const std::wformat_string<Args...> fmt, Args&&... _Args)
	{
		LogWarn(std::vformat(fmt.get(), std::make_wformat_args(_Args...)));
	}

	template <class... Args>
	inline void LogError(const std::format_string<Args...> fmt, Args&&... _Args)
	{
		LogError(std::vformat(fmt.get(), std::make_format_args(_Args...)));
	}

	template <class... Args>
	inline void LogError(const std::wformat_string<Args...> fmt, Args&&... _Args)
	{
		LogError(std::vformat(fmt.get(), std::make_wformat_args(_Args...)));
	}

#if _DEBUG
	void LogDebug(const std::string_view& str);
	void LogDebug(const std::wstring_view& str);

	template <class... Args>
	inline void LogDebug(const std::format_string<Args...> fmt, Args&&... _Args)
	{
		LogDebug(std::vformat(fmt.get(), std::make_format_args(_Args...)));
	}

	template <class... Args>
	inline void LogDebug(const std::wformat_string<Args...> fmt, Args&&... _Args)
	{
		LogDebug(std::vformat(fmt.get(), std::make_wformat_args(_Args...)));
	}
#else
	inline void LogDebug(const std::string_view& str)
	{
	}
	inline void LogDebug(const std::wstring_view& str)
	{
	}

	template <class... Args>
	inline void LogDebug(const std::format_string<Args...> fmt, Args&&... _Args)
	{
	}

	template <class... Args>
	inline void LogDebug(const std::wformat_string<Args...> fmt, Args&&... _Args)
	{
	}
#endif

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

#ifdef LOGGER_ENABLE_CALLBACK
	enum class LogLevel
	{
		Debug,
		Info,
		Warning,
		Error,
		OpenLogFile,
	};

	void SetLogCallback(const std::function<void(const std::string&, LogLevel level)>& callback);
	std::function<void(const std::string&, LogLevel level)> GetLogCallback();
#endif
};
