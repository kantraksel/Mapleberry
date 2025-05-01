#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include "WindowManager.h"
#include "WebView.h"
#include "Utils/version.h"
#include "Utils/Logger.h"
#include "App/GlobalScope.h"
#include "App/RealTimeThread.h"
#include "UxBridge.h"
#include "UxDriver.h"

WindowManager window;
WebView webview(window);
UxBridge uxbridge;
UxDriver uxdriver;

static void WebViewInitialized() //TODO: handle fails
{
	auto& view = webview.GetWebView();

	wil::com_ptr<ICoreWebView2Settings> settings;
	view->get_Settings(&settings);
#if NDEBUG
	settings->put_AreDefaultContextMenusEnabled(FALSE);
	settings->put_AreDevToolsEnabled(FALSE);
#endif

	uxbridge.Initialize();

	view->SetVirtualHostNameToFolderMapping(L"app.localhost", L"App", COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_DENY_CORS);
	view->Navigate(L"https://app.localhost/index.html");
}

int APIENTRY wWinMain(_In_ HINSTANCE hInstance, _In_opt_ HINSTANCE hPrevInstance, _In_ LPWSTR lpCmdLine, _In_ int nCmdShow)
{
	Logger::DisableTimestamp();
	Logger::Log(Version::Title);
	window.SetWindowTitle(Version::Title);

	if (!window.Initialize(hInstance))
		return 1;
	webview.Initialize(L"Data", &WebViewInitialized);
	uxdriver.Initialize();

	auto& thread = GlobalScope::GetRealTimeThread();
	thread.Start();

	window.Update();

	thread.Stop();
	thread.Wait();

	uxbridge.Shutdown();
	webview.Shutdown();
	window.Shutdown();
	return 0;
}
