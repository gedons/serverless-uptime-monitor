import { describe, it, expect } from "vitest";
import { validateMonitorUrl } from "../src/utils/urlSecurity.js";

describe("urlSecurity - SSRF Protection", () => {
  it("should allow valid public HTTPS URLs", async () => {
    await expect(
      validateMonitorUrl("https://example.com")
    ).resolves.not.toThrow();
  });

  it("should reject non-HTTP/HTTPS protocols", async () => {
    await expect(validateMonitorUrl("ftp://example.com")).rejects.toThrow(
      "Only HTTP and HTTPS URLs are supported"
    );
  });

  it("should reject localhost domain names", async () => {
    await expect(validateMonitorUrl("http://localhost/api")).rejects.toThrow(
      "Monitoring private hosts is not allowed"
    );
  });

  it("should reject Google Cloud internal metadata endpoint", async () => {
    await expect(
      validateMonitorUrl("http://metadata.google.internal")
    ).rejects.toThrow("Monitoring private hosts is not allowed");
  });

  it("should reject IPv4 loopback 127.0.0.1", async () => {
    await expect(validateMonitorUrl("http://127.0.0.1")).rejects.toThrow(
      "Monitoring private IP addresses is not allowed"
    );
  });

  it("should reject private RFC1918 10.x.x.x addresses", async () => {
    await expect(validateMonitorUrl("http://10.0.0.1")).rejects.toThrow(
      "Monitoring private IP addresses is not allowed"
    );
  });

  it("should reject private RFC1918 192.168.x.x addresses", async () => {
    await expect(validateMonitorUrl("http://192.168.1.1")).rejects.toThrow(
      "Monitoring private IP addresses is not allowed"
    );
  });

  it("should reject AWS/GCP cloud metadata IP 169.254.169.254", async () => {
    await expect(
      validateMonitorUrl("http://169.254.169.254")
    ).rejects.toThrow("Monitoring private IP addresses is not allowed");
  });

  it("should reject IPv6 loopback ::1", async () => {
    await expect(validateMonitorUrl("http://[::1]")).rejects.toThrow(
      "Monitoring private IP addresses is not allowed"
    );
  });
});
