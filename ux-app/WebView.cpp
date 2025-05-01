#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <WebView2EnvironmentOptions.h>
#include "WebView.h"
#include "WindowManager.h"
#include "Utils/Logger.h"

using namespace Microsoft::WRL;

WebView::WebView(WindowManager& window) : mWindow(window)
{
}

WebView::~WebView()
{
}

static void MessageError(const wchar_t* title, HRESULT result)
{
	WindowManager::ShowError(std::format(L"{} {}", title, Logger::FormatW(result)));
}

static void MessageError(const wchar_t* title)
{
	WindowManager::ShowError(title);
}

void WebView::Initialize(const wchar_t* appData, const Function<void()>& onInitialized)
{
	mInitializedEvent = onInitialized;
	auto* This = this;

	auto options = Make<CoreWebView2EnvironmentOptions>();
	auto result = CreateCoreWebView2EnvironmentWithOptions(nullptr, appData, options.Get(),
		Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
			[This](HRESULT errorCode, ICoreWebView2Environment* env) -> HRESULT
			{
				auto& window = This->mWindow;
				if (FAILED(errorCode))
				{
					MessageError(L"Failed to create WebView2 environment:", errorCode);
					window.Close();
					return S_OK;
				}

				// async callback (in main thread)
				auto hWnd = window.GetWindow();
				auto result = env->CreateCoreWebView2Controller(hWnd, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(This, &WebView::OnWebViewCreated).Get());
				if (FAILED(result))
				{
					MessageError(L"Failed to create WebView2 controller:", result);
					window.Close();
				}
				return S_OK;
			}
		).Get());

	if (SUCCEEDED(result))
		return;
	
	if (result == HRESULT_FROM_WIN32(ERROR_FILE_NOT_FOUND))
		MessageError(L"Edge WebView2 Runtime is not installed. Download link: https://go.microsoft.com/fwlink/p/?LinkId=2124703");
	else if (result == HRESULT_FROM_WIN32(ERROR_FILE_EXISTS) || result == E_ACCESSDENIED)
		MessageError(L"User data folder is locked");
	else if (result == E_FAIL)
		MessageError(L"WebView2 runtime failed to start");
	else
		MessageError(L"Failed to create WebView2 runtime:", result);
	mWindow.Close();
}

void WebView::Shutdown()
{
	if (mController)
		mController->Close();

	mWindow.ReplaceWndProc(nullptr, nullptr);
	mView.reset();
	mController.reset();
}

HRESULT WebView::OnWebViewCreated(HRESULT errorCode, ICoreWebView2Controller* controller)
{
	if (FAILED(errorCode))
	{
		if (errorCode == E_ABORT)
			return S_OK;

		MessageError(L"Failed to create WebView2 instance:", errorCode);
		mWindow.Close();
		return S_OK;
	}

	wil::com_ptr<ICoreWebView2> webview;
	errorCode = controller->get_CoreWebView2(&webview);
	if (FAILED(errorCode))
	{
		MessageError(L"Failed to get WebView2 instance:", errorCode);
		mWindow.Close();
		return S_OK;
	}
	mView = webview.try_query<ICoreWebView2_3>();
	if (!mView)
	{
		MessageError(L"Unsupported WebView2 version");
		mWindow.Close();
		return S_OK;
	}
	mController = controller;

	mWindow.ReplaceWndProc(&WebView::WndProc, this);
	ResizeWebView();

	if (mInitializedEvent)
		mInitializedEvent();
	return S_OK;
}

void WebView::ResizeWebView()
{
	RECT area;
	GetClientRect(mWindow.GetWindow(), &area);
	mController->put_Bounds(area);
}

LRESULT __stdcall WebView::WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
	auto* pInstance = (WebView*)GetWindowLongPtrW(hWnd, GWLP_USERDATA);

	switch (message)
	{
		case WM_SIZE:
		{
			if (lParam == 0)
				break;

			pInstance->ResizeWebView();
			return 0;
		}
	}
	return WindowManager::WndProc(hWnd, message, wParam, lParam);
}
