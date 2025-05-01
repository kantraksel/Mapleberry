#pragma once
#include <string>
#include "Utils/Function.hpp"
#undef PostMessage

typedef struct HWND__* HWND;
typedef struct HINSTANCE__* HINSTANCE;
typedef unsigned long long WPARAM;
typedef long long LPARAM;
typedef long long LRESULT;
typedef unsigned int UINT;

class WindowManager
{
	private:
		static WindowManager* mpInstance;
		HWND mWnd;
		std::wstring mName;

		bool RegisterWndClass(HINSTANCE hInst);
		bool InitWnd(HINSTANCE hInst);

	public:
		// allow to customize window behaviour
		static LRESULT __stdcall WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam);
		typedef LRESULT(__stdcall *WndProcFn)(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam);

		typedef Function<void(uint64_t, uint64_t)> UserMessageCallback;
		UserMessageCallback OnUserMessage;

	public:
		WindowManager();
		~WindowManager();

		bool Initialize(HINSTANCE hInstance);
		void Update();
		void Shutdown();

		void ReplaceWndProc(WndProcFn proc, void* userdata);
		void Resize(unsigned short width, unsigned short height);
		void Close();
		void PostMessage(uint64_t wParam, uint64_t lParam);

		void SetWindowTitle(const std::string_view& title);
		void SetWindowTitle(const std::wstring_view& title);
		HWND GetWindow() { return mWnd; }

		static void ShowError(const std::wstring_view& message);
		static void ShowInfo(const std::wstring_view& message);
};
