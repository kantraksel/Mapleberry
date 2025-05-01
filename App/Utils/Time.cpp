#include <chrono>
#include <thread>
#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
#include "Time.h"

// guaranteed 1MHz+ (<1us)
static long long GetFrequency()
{
	LARGE_INTEGER freq;
	QueryPerformanceFrequency(&freq);
	return freq.QuadPart;
}

static long long Frequency = GetFrequency();
static long long FrequencyMilli = Frequency / std::milli::den;
static double TickTimeMilli = 1.0 / double(FrequencyMilli);

double Time::SteadyNow()
{
	LARGE_INTEGER ctr;
	QueryPerformanceCounter(&ctr);
	return double(ctr.QuadPart) * TickTimeMilli;
}

long long Time::SteadyNowInt()
{
	LARGE_INTEGER ctr;
	QueryPerformanceCounter(&ctr);
	return ctr.QuadPart / FrequencyMilli;
}

void Time::Sleep(unsigned int ms)
{
	std::this_thread::sleep_for(std::chrono::milliseconds(ms));
}
