#pragma once
#include <msgpack.hpp>
#include "Utils/FixedArray.h"

struct MsgPacker
{
	msgpack::sbuffer buffer;
	msgpack::packer<msgpack::sbuffer> packer;

	MsgPacker() : packer(&buffer)
	{
	}

	MsgPacker& pack_map(uint32_t n)
	{
		packer.pack_map(n);
		return *this;
	}

	MsgPacker& pack_array(uint32_t n)
	{
		packer.pack_array(n);
		return *this;
	}

	template <typename T>
	MsgPacker& pack(const T& v)
	{
		packer.pack(v);
		return *this;
	}

	template <typename T, typename U>
	MsgPacker& pack(const T& v, const U& w)
	{
		packer.pack(v).pack(w);
		return *this;
	}

	MsgPacker& write_raw(const FixedArrayCharS& data)
	{
		buffer.write(data, data.size());
		return *this;
	}

	FixedArrayCharS view()
	{
		return FixedArrayCharS::CreateArrayRef(buffer.data(), buffer.size());
	}

	FixedArrayCharS copy_buffer()
	{
		return FixedArrayCharS::Copy(buffer.data(), buffer.size());
	}

	void clear()
	{
		buffer.clear();
	}
};
