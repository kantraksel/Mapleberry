#include "UxBridge.h"
#include "WebView.h"
#include "Utils/Logger.h"
#include "Utils/StringUtils.h"

extern WebView webview;

static_assert(sizeof(EventRegistrationToken) == sizeof(int64_t));
static_assert(sizeof(EventRegistrationToken::value) == sizeof(int64_t));

UxBridge::UxBridge() : token(0)
{

}

UxBridge::~UxBridge()
{

}

bool UxBridge::Initialize()
{
	auto& view = webview.GetWebView();

	EventRegistrationToken token;
	auto callback = Microsoft::WRL::Callback<ICoreWebView2WebMessageReceivedEventHandler>(this, &UxBridge::OnWebMessage);
	auto result = view->add_WebMessageReceived(callback.Get(), &token);
	if (FAILED(result))
	{
		Logger::LogError("Failed to add WebMessageReceived callback: {}", Logger::Format(result));
		return false;
	}

	this->token = token.value;
	return true;
}

void UxBridge::Shutdown()
{
	auto& view = webview.GetWebView();

	if (token)
	{
		view->remove_WebMessageReceived({ token });
		token = 0;
	}
}

void UxBridge::RegisterHandler(const std::string& id, const WebViewCallback& callback)
{
	callbacks[id] = callback;
}

void UxBridge::Send(const std::string_view& id, nlohmann::json& obj)
{
	auto& view = webview.GetWebView();
	if (!view)
	{
		Logger::Log("Tried to send message {}, WebView not initialized", id);
		return;
	}

	try
	{
		obj["_msg_id"] = id;
		auto str = obj.dump();
		view->PostWebMessageAsJson(StringUtils::Utf8ToWideString(str).c_str());
	}
	catch (const nlohmann::json::exception& e)
	{
		Logger::LogWarn("Tried to send invalid message - {}", e.what());
	}
}

HRESULT UxBridge::OnWebMessage(ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args)
{
	wil::unique_cotaskmem_string cstring;
	if (FAILED(args->get_Source(&cstring)))
		return S_OK;
	if (!std::wstring_view(cstring.get()).starts_with(L"https://app.localhost/"))
	{
#if _DEBUG
		if (!std::wstring_view(cstring.get()).starts_with(L"http://localhost:5173/"))
			return S_OK;
#else
		return S_OK;
#endif
	}

	if (FAILED(args->get_WebMessageAsJson(&cstring)))
		return S_OK;

	try
	{
		auto json = nlohmann::json::parse(StringUtils::WideStringToUtf8(cstring.get()));
		cstring.reset();

		std::string type = json["_msg_id"];
		auto i = callbacks.find(type);
		if (i == callbacks.end())
		{
			Logger::LogWarn("Message {} has been discarded", type);
			return S_OK;
		}

		i->second(json);
	}
	catch (const nlohmann::json::exception& e)
	{
		Logger::LogWarn("Message is invalid - {}", e.what());
	}
	return S_OK;
}
