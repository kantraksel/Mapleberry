#pragma once
#include <wrl.h>
#include <wil/com.h>
#include <WebView2.h>
#include "WindowManager.h"
#include "Utils/Function.hpp"

class WebView
{
private:
	WindowManager& mWindow;
	wil::com_ptr<ICoreWebView2Controller> mController;
	wil::com_ptr<ICoreWebView2_3> mView;
	Function<void()> mInitializedEvent;

	static LRESULT __stdcall WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam);
	void ResizeWebView();
	HRESULT OnWebViewCreated(HRESULT errorCode, ICoreWebView2Controller* controller);

public:
	WebView(WindowManager& window);
	~WebView();

	void Initialize(const wchar_t* appData, const Function<void()>& onInitialized);
	void Shutdown();

	auto& GetController() { return mController; }
	auto& GetWebView() { return mView; }
};
