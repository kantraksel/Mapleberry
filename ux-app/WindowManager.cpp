#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <dwmapi.h>
#include "WindowManager.h"
#include "Utils/Logger.h"
#include "Utils/StringUtils.h"

#pragma comment(lib, "dwmapi")

constexpr std::wstring_view WindowClass = L"PositronCppJs";
constexpr UINT WM_APPMESSAGE = WM_USER + 0;

WindowManager* WindowManager::mpInstance = nullptr;

WindowManager::WindowManager() : mWnd(NULL), mName(WindowClass)
{
	if (mpInstance)
		Logger::LogWarn("Instantiated WindowManager too many times!");

	mpInstance = this;
}

WindowManager::~WindowManager()
{
	if (mpInstance == this)
		mpInstance = nullptr;
}

bool WindowManager::Initialize(HINSTANCE hInstance)
{
	if (!RegisterWndClass(hInstance))
	{
		Logger::LogError("Failed to register window class: {:X}", GetLastError());
		return false;
	}

	if (!InitWnd(hInstance))
	{
		Logger::LogError("Failed to create window: {:X}", GetLastError());
		return false;
	}
	return true;
}

void WindowManager::Shutdown()
{
	if (mWnd)
	{
		DestroyWindow(mWnd);
		mWnd = NULL;
	}
}

void WindowManager::ReplaceWndProc(WndProcFn proc, void* userdata)
{
	if (!mWnd)
		return;

	if (!proc)
		proc = WndProc;

	if (!userdata)
		userdata = this;

	SetWindowLongPtrW(mWnd, GWLP_WNDPROC, (LONG_PTR)proc);
	SetWindowLongPtrW(mWnd, GWLP_USERDATA, (LONG_PTR)userdata);
}

void WindowManager::Resize(unsigned short width, unsigned short height)
{
	if (!mWnd)
		return;
	SetWindowPos(mWnd, HWND_TOP, 0, 0, width, height, SWP_NOMOVE);
}

void WindowManager::Close()
{
	if (!mWnd)
		return;
	CloseWindow(mWnd);
}

void WindowManager::PostMessage(uint64_t wParam, uint64_t lParam)
{
	if (!mWnd)
		return;
	PostMessageW(mWnd, WM_APPMESSAGE, wParam, lParam);
}

void WindowManager::Update()
{
	MSG msg;
	while (GetMessage(&msg, nullptr, 0, 0))
	{
		TranslateMessage(&msg);
		DispatchMessage(&msg);
	}
}

bool WindowManager::RegisterWndClass(HINSTANCE hInst)
{
	WNDCLASSEXW wcex{ sizeof(WNDCLASSEX) };

	wcex.style = 0;
	wcex.lpfnWndProc = WndProc;
	wcex.cbClsExtra = 0;
	wcex.cbWndExtra = sizeof(uintptr_t);
	wcex.hInstance = hInst;
	wcex.hIcon = LoadIcon(nullptr, IDI_APPLICATION);
	wcex.hCursor = LoadCursor(nullptr, IDC_ARROW);
	wcex.hbrBackground = CreateSolidBrush(RGB(0, 0, 0));
	wcex.lpszMenuName = nullptr;
	wcex.lpszClassName = WindowClass.data();
	wcex.hIconSm = LoadIcon(nullptr, IDI_APPLICATION);

	return RegisterClassExW(&wcex) != 0;
}

bool WindowManager::InitWnd(HINSTANCE hInst)
{
	constexpr DWORD style = WS_OVERLAPPEDWINDOW | WS_CLIPCHILDREN | WS_CLIPSIBLINGS;
	mWnd = CreateWindowExW(WS_EX_CONTROLPARENT, WindowClass.data(), mName.c_str(), style, CW_USEDEFAULT, 0, CW_USEDEFAULT, 0, nullptr, nullptr, hInst, nullptr);

	if (!mWnd)
		return false;

	SetWindowLongPtrW(mWnd, 0, (LONG_PTR)this);

	BOOL value = TRUE;
	DwmSetWindowAttribute(mWnd, DWMWA_USE_IMMERSIVE_DARK_MODE, &value, sizeof(value));

	ShowWindow(mWnd, SW_SHOW);
	UpdateWindow(mWnd);

	return true;
}

LRESULT CALLBACK WindowManager::WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
	auto* pInstance = (WindowManager*)GetWindowLongPtrW(hWnd, 0);
	if (!pInstance)
		return DefWindowProc(hWnd, message, wParam, lParam);

	switch (message)
	{
		case WM_APPMESSAGE:
		{
			auto& onUserMessage = pInstance->OnUserMessage;
			if (onUserMessage)
				onUserMessage(static_cast<uint64_t>(wParam), static_cast<uint64_t>(lParam));
			break;
		}

		case WM_DESTROY:
			PostQuitMessage(0);
			break;

		default:
			return DefWindowProc(hWnd, message, wParam, lParam);
	}
	return 0;
}

void WindowManager::SetWindowTitle(const std::string_view& title)
{
	if (title.empty())
		SetWindowTitle(std::wstring_view());
	else
		SetWindowTitle(StringUtils::Utf8ToWideString(title));
}

void WindowManager::SetWindowTitle(const std::wstring_view& title)
{
	if (title.empty())
		mName = WindowClass;
	else
		mName = title;

	if (mWnd != NULL)
		SetWindowTextW(mWnd, mName.c_str());
}

void WindowManager::ShowError(const std::wstring_view& message)
{
	Logger::LogError(L"WindowManager::ShowError: {}", message);

	HWND wnd = NULL;
	auto name = WindowClass;
	if (mpInstance)
	{
		wnd = mpInstance->mWnd;
		name = mpInstance->mName;
	}

	auto msg = std::wstring(message);
	MessageBoxW(wnd, msg.data(), name.data(), MB_ICONERROR | MB_OK);
}

void WindowManager::ShowInfo(const std::wstring_view& message)
{
	Logger::Log(L"WindowManager::ShowInfo: {}", message);

	HWND wnd = NULL;
	auto name = WindowClass;
	if (mpInstance)
	{
		wnd = mpInstance->mWnd;
		name = mpInstance->mName;
	}

	auto msg = std::wstring(message);
	MessageBoxW(wnd, msg.data(), name.data(), MB_ICONINFORMATION | MB_OK);
}
