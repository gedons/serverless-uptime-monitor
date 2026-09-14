import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);

  if (parts.length !== 4) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);

  if (version === 4) {
    return isPrivateIPv4(ip);
  }

  if (version === 6) {
    return isPrivateIPv6(ip);
  }

  return true;
}

export async function validateMonitorUrl(
  value: string
): Promise<void> {

  const url = new URL(value);

  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }

  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1);
  }

  const blockedHostnames = new Set([
    "localhost",
    "localhost.localdomain",
    "metadata.google.internal"
  ]);

  if (blockedHostnames.has(hostname)) {
    throw new Error("Monitoring private hosts is not allowed");
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(
        "Monitoring private IP addresses is not allowed"
      );
    }

    return;
  }

  const addresses = await dns.lookup(hostname, {
    all: true
  });

  if (addresses.length === 0) {
    throw new Error("Unable to resolve hostname");
  }

  for (const address of addresses) {
    if (isPrivateIp(address.address)) {
      throw new Error(
        "The target resolves to a private IP address"
      );
    }
  }
}