#pragma once
#include <boost/beast/http.hpp>
#include "version.hpp"

struct HttpMessage
{
	template <typename Body>
	static auto Create(boost::beast::http::request<boost::beast::http::string_body>& request, boost::beast::http::status status)
	{
		boost::beast::http::response<Body> response{ status, request.version() };
		response.keep_alive(request.keep_alive());
		response.set(boost::beast::http::field::server, TEAPOT_VERSION);
		return response;
	}

	template <typename Body>
	static void Setup(boost::beast::http::response<Body>& response, boost::beast::http::request<boost::beast::http::string_body>& request)
	{
		response.keep_alive(request.keep_alive());
		response.set(boost::beast::http::field::server, TEAPOT_VERSION);
	}
};
