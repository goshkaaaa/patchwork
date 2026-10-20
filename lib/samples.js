export const sampleBefore = JSON.stringify(
  {
    service: "dispatch",
    version: "2.3.0",
    region: "eu-central-1",
    features: { webhooks: true, retries: 3, legacyAuth: true },
    limits: { requestsPerMinute: 120, timeout: 3000 },
    maintainers: ["alex", "sam"],
  },
  null,
  2,
);
export const sampleAfter = JSON.stringify(
  {
    service: "dispatch",
    version: "2.4.0",
    region: "eu-central-1",
    features: { webhooks: true, retries: 5, auditLog: true },
    limits: { requestsPerMinute: 240, timeout: 3000 },
    maintainers: ["alex", "sam", "jules"],
  },
  null,
  2,
);
