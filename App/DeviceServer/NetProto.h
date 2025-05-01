#pragma once

// Protocol meta
constexpr unsigned char ProtoVersion = 4;
constexpr unsigned char ProtoRevision = 14;

constexpr unsigned short DefaultPort = 4209;
constexpr int MaxPacketSize = 1340; // MTU(1500) - IP frame(96) - UDP header(64)

constexpr int DefaultConnectTimeoutMs = 3 * 1000;
constexpr int DefaultTimeoutMs = 10 * 1000;
constexpr int DefaultHeartbeatMs = 1 * 1000;

// Packet formats
enum class PacketType : unsigned char
{
	Unknown = 0,
	Heartbeat,
	ConnNego,
	Protocol,
	Drop,
};

enum class DropReason : unsigned char
{
	Invalid = 0,
	Banned,
	Disconnected,
	Full,
	InvalidProto,
	Kicked,
	TimedOut,

	//NOTE: not used on wire
	Local,
	ConnectTimeout,

	InvalidPacket,
};

struct PacketHeader
{
	PacketType header;
};

struct PacketConnNego : PacketHeader
{
	unsigned char proto;
	unsigned char rev;
};

struct PacketConnNegoResponse : PacketConnNego
{
	unsigned char user;
};

struct PacketDrop : PacketHeader
{
	DropReason dropReason;
};

// High Level Packets
// Rev 14 - RaspFly
struct PacketInput : PacketHeader
{
	char _reserved[3];
	unsigned int inputId;
	unsigned int inputData;
};

enum class ClientRpc : unsigned char
{
	None,
	RebootDev,
};

struct PacketRpc : PacketHeader
{
	ClientRpc code;
};
