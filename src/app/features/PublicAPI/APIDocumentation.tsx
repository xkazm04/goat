"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  Key,
  Zap,
  BarChart3,
  TrendingUp,
  Layers,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Shield,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  language: string;
  code: string;
  title?: string;
}

function CodeBlock({ language, code, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg overflow-hidden bg-gray-900 border border-gray-800" data-testid="code-block">
      {title && (
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-mono">{title}</span>
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-white transition-colors"
            data-testid="copy-code-btn"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="text-gray-300 font-mono">{code}</code>
      </pre>
    </div>
  );
}

interface EndpointCardProps {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  tier: "free" | "basic" | "pro" | "enterprise";
  children?: React.ReactNode;
}

function EndpointCard({ method, path, description, tier, children }: EndpointCardProps) {
  const [expanded, setExpanded] = useState(false);

  const methodColors: Record<string, string> = {
    GET: "bg-emerald-500/20 text-emerald-400",
    POST: "bg-blue-500/20 text-blue-400",
    PUT: "bg-amber-500/20 text-amber-400",
    DELETE: "bg-rose-500/20 text-rose-400",
  };

  const tierColors: Record<string, string> = {
    free: "bg-gray-500/20 text-gray-400",
    basic: "bg-cyan-500/20 text-cyan-400",
    pro: "bg-purple-500/20 text-purple-400",
    enterprise: "bg-yellow-500/20 text-yellow-400",
  };

  return (
    <div
      className="border border-gray-800 rounded-xl overflow-hidden bg-gray-900/50"
      data-testid={`endpoint-${path.replace(/\//g, "-")}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/50 transition-colors"
        data-testid="endpoint-toggle-btn"
      >
        <span className={cn("px-2 py-1 rounded text-xs font-bold font-mono", methodColors[method])}>
          {method}
        </span>
        <code className="text-white font-mono text-sm flex-1 text-left">{path}</code>
        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", tierColors[tier])}>
          {tier}
        </span>
        <ChevronDown
          className={cn("w-4 h-4 text-gray-400 transition-transform", expanded && "rotate-180")}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-800"
          >
            <div className="p-4 space-y-4">
              <p className="text-gray-400 text-sm">{description}</p>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tier: string;
}

function FeatureCard({ icon, title, description, tier }: FeatureCardProps) {
  return (
    <div
      className="p-4 rounded-xl bg-gray-900/50 border border-gray-800"
      data-testid={`feature-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">{icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white">{title}</h4>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{tier}</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

export const APIDocumentation = memo(function APIDocumentation() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
        <div className="relative max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              Universal Ranking API
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              The{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                Rotten Tomatoes
              </span>{" "}
              of Everything
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              Access GOAT consensus rankings through our public API. Embed widgets, build
              integrations, and leverage community-driven rankings across all categories.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="#quick-start"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold hover:opacity-90 transition-opacity"
                data-testid="get-started-btn"
              >
                Get Started
              </a>
              <a
                href="#endpoints"
                className="px-6 py-3 rounded-xl bg-gray-800 text-white font-semibold hover:bg-gray-700 transition-colors"
                data-testid="view-endpoints-btn"
              >
                View Endpoints
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-8">Features</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Globe className="w-5 h-5" />}
            title="Public Rankings"
            description="Access consensus rankings for any category with detailed statistical data."
            tier="Free"
          />
          <FeatureCard
            icon={<Layers className="w-5 h-5" />}
            title="Embeddable Widgets"
            description="Drop-in widgets for any website. Displays GOAT rankings with your branding."
            tier="Free"
          />
          <FeatureCard
            icon={<BarChart3 className="w-5 h-5" />}
            title="Analytics Dashboard"
            description="Detailed insights into ranking distributions and user sentiment."
            tier="Basic"
          />
          <FeatureCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Historical Trends"
            description="Track how rankings evolve over time with granular historical data."
            tier="Pro"
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            title="Peer Clusters"
            description="Understand different user segments and their unique ranking patterns."
            tier="Pro"
          />
          <FeatureCard
            icon={<Shield className="w-5 h-5" />}
            title="Enterprise SLA"
            description="Priority support, custom integrations, and dedicated infrastructure."
            tier="Enterprise"
          />
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="border-y border-gray-800 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold mb-8">API Tiers</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Free", price: "$0", requests: "100/day", features: ["Rankings API", "Widgets"] },
              {
                name: "Basic",
                price: "$29",
                requests: "1,000/day",
                features: ["Rankings API", "Widgets", "Analytics"],
              },
              {
                name: "Pro",
                price: "$99",
                requests: "10,000/day",
                features: ["All Basic features", "Trends", "Peer Clusters", "Export"],
              },
              {
                name: "Enterprise",
                price: "Custom",
                requests: "Unlimited",
                features: ["All Pro features", "Custom branding", "Priority support", "SLA"],
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className="p-4 rounded-xl bg-gray-900/50 border border-gray-800"
                data-testid={`tier-${tier.name.toLowerCase()}`}
              >
                <h3 className="font-semibold text-lg mb-1">{tier.name}</h3>
                <p className="text-2xl font-bold text-cyan-400 mb-2">
                  {tier.price}
                  <span className="text-sm text-gray-400 font-normal">/mo</span>
                </p>
                <p className="text-sm text-gray-400 mb-3">{tier.requests} requests</p>
                <ul className="space-y-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="text-sm text-gray-400 flex items-center gap-2">
                      <Check className="w-3 h-3 text-emerald-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div id="quick-start" className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-8">Quick Start</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              1. Get your API Key
            </h3>
            <p className="text-gray-400 mb-3">
              Sign up for a free account to get your API key. Include it in your requests via the
              X-API-Key header.
            </p>
            <CodeBlock
              language="bash"
              title="Authentication"
              code={`# Using X-API-Key header
curl -H "X-API-Key: goat_your_api_key" \\
  https://goat.app/api/v1/rankings?category=Movies

# Or using Authorization header
curl -H "Authorization: Bearer goat_your_api_key" \\
  https://goat.app/api/v1/rankings?category=Movies`}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-cyan-400" />
              2. Fetch Rankings
            </h3>
            <CodeBlock
              language="javascript"
              title="JavaScript Example"
              code={`// Fetch top 10 movies
const response = await fetch(
  'https://goat.app/api/v1/rankings?category=Movies&pageSize=10',
  {
    headers: {
      'X-API-Key': 'goat_your_api_key'
    }
  }
);

const data = await response.json();

// Response structure
{
  "rankings": [
    {
      "id": "abc123",
      "name": "The Godfather",
      "imageUrl": "https://...",
      "category": "Movies",
      "consensus": {
        "rank": 1,
        "medianRank": 1,
        "volatility": 1.2,
        "volatilityLevel": "stable",
        "totalRankings": 5432,
        "confidence": 0.95
      }
    }
  ],
  "meta": {
    "category": "Movies",
    "totalItems": 1000,
    "totalRankings": 50000,
    "lastUpdated": "2024-01-15T10:30:00Z",
    "apiVersion": "1.0"
  }
}`}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              3. Embed a Widget
            </h3>
            <CodeBlock
              language="html"
              title="HTML Widget Embed"
              code={`<!-- Add the GOAT widget script -->
<script src="https://goat.app/api/v1/widgets/embed.js"></script>

<!-- Option 1: Auto-initialize with data attributes -->
<div
  data-goat-widget="ranking"
  data-goat-api-key="goat_your_api_key"
  data-goat-category="Movies"
  data-goat-theme="dark"
  data-goat-limit="10"
></div>

<!-- Option 2: Manual initialization -->
<div id="my-widget"></div>
<script>
  GOAT.render('#my-widget', {
    apiKey: 'goat_your_api_key',
    type: 'ranking',
    category: 'Movies',
    theme: 'dark',
    limit: 10,
    showVolatility: true
  });
</script>`}
            />
          </div>
        </div>
      </div>

      {/* API Endpoints */}
      <div id="endpoints" className="border-t border-gray-800 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold mb-8">API Endpoints</h2>

          <div className="space-y-4">
            <EndpointCard
              method="GET"
              path="/api/v1/rankings"
              description="Get consensus rankings for a category. Returns ranked items with consensus data including median rank, volatility, and confidence scores."
              tier="free"
            >
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-semibold text-white mb-2">Query Parameters</h5>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-800">
                      <tr>
                        <td className="py-2 font-mono text-cyan-400">category</td>
                        <td className="py-2 text-gray-400">Required. Category to get rankings for.</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-cyan-400">subcategory</td>
                        <td className="py-2 text-gray-400">Optional subcategory filter.</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-cyan-400">page</td>
                        <td className="py-2 text-gray-400">Page number (default: 1).</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-cyan-400">pageSize</td>
                        <td className="py-2 text-gray-400">Items per page (default: 20, max: 100).</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-cyan-400">sort</td>
                        <td className="py-2 text-gray-400">Sort by: rank, volatility, confidence.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <CodeBlock
                  language="bash"
                  title="Example Request"
                  code={`curl -H "X-API-Key: goat_your_key" \\
  "https://goat.app/api/v1/rankings?category=Movies&pageSize=10"`}
                />
              </div>
            </EndpointCard>

            <EndpointCard
              method="GET"
              path="/api/v1/rankings/{itemId}"
              description="Get detailed ranking data for a specific item including distribution, percentiles, and optional peer cluster breakdown."
              tier="free"
            >
              <CodeBlock
                language="bash"
                title="Example Request"
                code={`curl -H "X-API-Key: goat_your_key" \\
  "https://goat.app/api/v1/rankings/abc123"`}
              />
            </EndpointCard>

            <EndpointCard
              method="GET"
              path="/api/v1/categories"
              description="Get list of available categories and subcategories with item counts."
              tier="free"
            >
              <CodeBlock
                language="bash"
                title="Example Request"
                code={`curl -H "X-API-Key: goat_your_key" \\
  "https://goat.app/api/v1/categories"`}
              />
            </EndpointCard>

            <EndpointCard
              method="GET"
              path="/api/v1/analytics"
              description="Get detailed analytics for a category including distribution breakdown, top items, and optional peer cluster analysis."
              tier="basic"
            >
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-semibold text-white mb-2">Query Parameters</h5>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-800">
                      <tr>
                        <td className="py-2 font-mono text-cyan-400">category</td>
                        <td className="py-2 text-gray-400">Required. Category to analyze.</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-cyan-400">period</td>
                        <td className="py-2 text-gray-400">Time period: 7d, 30d, 90d, 1y.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <CodeBlock
                  language="bash"
                  title="Example Request"
                  code={`curl -H "X-API-Key: goat_your_key" \\
  "https://goat.app/api/v1/analytics?category=Movies&period=30d"`}
                />
              </div>
            </EndpointCard>

            <EndpointCard
              method="GET"
              path="/api/v1/trends"
              description="Get historical trend data for an item showing how its ranking has evolved over time."
              tier="pro"
            >
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-semibold text-white mb-2">Query Parameters</h5>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-800">
                      <tr>
                        <td className="py-2 font-mono text-cyan-400">itemId</td>
                        <td className="py-2 text-gray-400">Required. Item ID to get trends for.</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-cyan-400">period</td>
                        <td className="py-2 text-gray-400">Time period: 7d, 30d, 90d, 1y.</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-cyan-400">granularity</td>
                        <td className="py-2 text-gray-400">Data granularity: day, week, month.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <CodeBlock
                  language="bash"
                  title="Example Request"
                  code={`curl -H "X-API-Key: goat_your_key" \\
  "https://goat.app/api/v1/trends?itemId=abc123&period=30d&granularity=day"`}
                />
              </div>
            </EndpointCard>
          </div>
        </div>
      </div>

      {/* Rate Limits */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-8">Rate Limits</h2>
        <div className="rounded-xl bg-gray-900/50 border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-800/50">
                <th className="px-4 py-3 text-left font-semibold">Tier</th>
                <th className="px-4 py-3 text-left font-semibold">Per Minute</th>
                <th className="px-4 py-3 text-left font-semibold">Per Day</th>
                <th className="px-4 py-3 text-left font-semibold">Per Month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr>
                <td className="px-4 py-3 text-gray-400">Free</td>
                <td className="px-4 py-3">10</td>
                <td className="px-4 py-3">100</td>
                <td className="px-4 py-3">1,000</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-400">Basic</td>
                <td className="px-4 py-3">60</td>
                <td className="px-4 py-3">1,000</td>
                <td className="px-4 py-3">30,000</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-400">Pro</td>
                <td className="px-4 py-3">300</td>
                <td className="px-4 py-3">10,000</td>
                <td className="px-4 py-3">300,000</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-400">Enterprise</td>
                <td className="px-4 py-3">1,000</td>
                <td className="px-4 py-3">100,000</td>
                <td className="px-4 py-3">3,000,000</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-400 mt-4">
          Rate limit headers are included in every response: X-RateLimit-Remaining, X-RateLimit-Reset.
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="font-semibold text-white">GOAT API</span>
              <span className="text-sm">v1.0</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="/support" className="hover:text-white transition-colors">
                Support
              </a>
              <a href="/terms" className="hover:text-white transition-colors">
                Terms
              </a>
              <a href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </a>
              <a
                href="https://github.com/goat-app/api"
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                GitHub <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default APIDocumentation;
