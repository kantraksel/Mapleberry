#pragma once

namespace Time
{
	/// <summary>
	/// Local/relative timestamp in milliseconds. Precision up to 1/10.000th of millisecond (0,1 microsecond)
	/// </summary>
	double SteadyNow();

	/// <summary>
	/// Local/relative timestamp in milliseconds
	/// </summary>
	long long SteadyNowInt();

	/// <summary>
	/// Sleep for at least specified time in ms
	/// </summary>
	void Sleep(unsigned int ms);

	/// <summary>
	/// Constexpr time unit conversion
	/// </summary>
	constexpr long long SecondToMs(unsigned int s)
	{
		return ((long long)s) * 1000;
	}
};
