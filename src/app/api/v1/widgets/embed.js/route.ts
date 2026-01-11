import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/widgets/embed.js
 *
 * Returns the embeddable JavaScript widget loader.
 * This script can be included on any website to display GOAT rankings.
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';

  // The embed script that will be served to third-party websites
  const embedScript = `
(function() {
  'use strict';

  // GOAT Widget Embed Script v1.0
  var GOAT = window.GOAT || {};

  GOAT.version = '1.0.0';
  GOAT.baseUrl = '${process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app'}';
  GOAT.apiUrl = GOAT.baseUrl + '/api/v1';
  GOAT.widgets = [];

  // Configuration defaults
  GOAT.defaults = {
    theme: 'dark',
    size: 'default',
    limit: 10,
    showVolatility: false,
    showClusters: false
  };

  // Utility functions
  function createElement(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function(key) {
        if (key === 'className') {
          el.className = attrs[key];
        } else if (key === 'style' && typeof attrs[key] === 'object') {
          Object.assign(el.style, attrs[key]);
        } else if (key.startsWith('data-')) {
          el.setAttribute(key, attrs[key]);
        } else {
          el[key] = attrs[key];
        }
      });
    }
    if (children) {
      if (Array.isArray(children)) {
        children.forEach(function(child) {
          if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
          } else if (child) {
            el.appendChild(child);
          }
        });
      } else if (typeof children === 'string') {
        el.textContent = children;
      } else {
        el.appendChild(children);
      }
    }
    return el;
  }

  function injectStyles() {
    if (document.getElementById('goat-widget-styles')) return;

    var styles = document.createElement('style');
    styles.id = 'goat-widget-styles';
    styles.textContent = \`
      .goat-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.5;
        box-sizing: border-box;
      }
      .goat-widget * {
        box-sizing: border-box;
      }
      .goat-widget-dark {
        --goat-bg: #111827;
        --goat-border: #1f2937;
        --goat-text: #ffffff;
        --goat-muted: #9ca3af;
        --goat-accent: #22d3ee;
        --goat-item-bg: rgba(31, 41, 55, 0.5);
      }
      .goat-widget-light {
        --goat-bg: #ffffff;
        --goat-border: #e5e7eb;
        --goat-text: #111827;
        --goat-muted: #6b7280;
        --goat-accent: #0891b2;
        --goat-item-bg: #f9fafb;
      }
      .goat-widget-container {
        background: var(--goat-bg);
        border: 1px solid var(--goat-border);
        border-radius: 12px;
        overflow: hidden;
      }
      .goat-widget-header {
        padding: 12px 16px;
        border-bottom: 1px solid var(--goat-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .goat-widget-title {
        font-weight: 600;
        color: var(--goat-text);
        margin: 0;
        font-size: 14px;
      }
      .goat-widget-powered {
        font-size: 11px;
        color: var(--goat-muted);
        text-decoration: none;
      }
      .goat-widget-powered:hover {
        color: var(--goat-accent);
      }
      .goat-widget-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .goat-widget-item {
        display: flex;
        align-items: center;
        padding: 10px 16px;
        border-bottom: 1px solid var(--goat-border);
        transition: background 0.15s;
        gap: 12px;
      }
      .goat-widget-item:last-child {
        border-bottom: none;
      }
      .goat-widget-item:hover {
        background: var(--goat-item-bg);
      }
      .goat-widget-rank {
        font-weight: 700;
        font-size: 12px;
        width: 28px;
        text-align: center;
        flex-shrink: 0;
      }
      .goat-widget-rank-1 { color: #facc15; }
      .goat-widget-rank-2 { color: #d1d5db; }
      .goat-widget-rank-3 { color: #f59e0b; }
      .goat-widget-rank-top { color: var(--goat-accent); }
      .goat-widget-rank-default { color: var(--goat-muted); }
      .goat-widget-image {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        object-fit: cover;
        flex-shrink: 0;
      }
      .goat-widget-name {
        flex: 1;
        font-weight: 500;
        font-size: 13px;
        color: var(--goat-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .goat-widget-votes {
        font-size: 11px;
        color: var(--goat-muted);
        flex-shrink: 0;
      }
      .goat-widget-footer {
        padding: 10px 16px;
        border-top: 1px solid var(--goat-border);
      }
      .goat-widget-link {
        font-size: 12px;
        font-weight: 500;
        color: var(--goat-accent);
        text-decoration: none;
      }
      .goat-widget-link:hover {
        text-decoration: underline;
      }
      .goat-widget-loading {
        padding: 24px;
        text-align: center;
        color: var(--goat-muted);
      }
      .goat-widget-error {
        padding: 16px;
        color: #ef4444;
        font-size: 13px;
      }
      .goat-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        text-decoration: none;
        transition: transform 0.15s;
      }
      .goat-badge:hover {
        transform: scale(1.05);
      }
      .goat-badge-dark {
        background: linear-gradient(135deg, #111827, #1f2937);
        border: 1px solid #374151;
        color: #ffffff;
      }
      .goat-badge-light {
        background: linear-gradient(135deg, #ffffff, #f9fafb);
        border: 1px solid #e5e7eb;
        color: #111827;
      }
      .goat-volatility {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
      }
      .goat-volatility-stable { background: rgba(16, 185, 129, 0.2); color: #10b981; }
      .goat-volatility-moderate { background: rgba(34, 211, 238, 0.2); color: #22d3ee; }
      .goat-volatility-contested { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
      .goat-volatility-polarizing { background: rgba(251, 113, 133, 0.2); color: #fb7185; }
    \`;
    document.head.appendChild(styles);
  }

  // Fetch rankings from API
  function fetchRankings(config) {
    var url = GOAT.apiUrl + '/rankings?';
    var params = new URLSearchParams({
      category: config.category || '',
      pageSize: (config.limit || GOAT.defaults.limit).toString()
    });
    if (config.subcategory) params.append('subcategory', config.subcategory);

    return fetch(url + params.toString(), {
      headers: {
        'X-API-Key': config.apiKey || '',
        'Accept': 'application/json'
      }
    })
    .then(function(res) {
      if (!res.ok) throw new Error('API request failed');
      return res.json();
    });
  }

  // Fetch single item
  function fetchItem(config) {
    var url = GOAT.apiUrl + '/rankings/' + config.itemId;
    return fetch(url, {
      headers: {
        'X-API-Key': config.apiKey || '',
        'Accept': 'application/json'
      }
    })
    .then(function(res) {
      if (!res.ok) throw new Error('API request failed');
      return res.json();
    });
  }

  // Render ranking widget
  function renderRankingWidget(container, data, config) {
    var theme = config.theme || GOAT.defaults.theme;
    var rankings = data.rankings || [];

    var widget = createElement('div', {
      className: 'goat-widget goat-widget-' + theme,
      'data-testid': 'goat-embed-widget'
    });

    var widgetContainer = createElement('div', { className: 'goat-widget-container' });

    // Header
    var header = createElement('div', { className: 'goat-widget-header' }, [
      createElement('h3', { className: 'goat-widget-title' },
        'Top ' + rankings.length + ' ' + (config.category || 'Rankings')),
      createElement('a', {
        className: 'goat-widget-powered',
        href: GOAT.baseUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        'data-testid': 'goat-embed-powered'
      }, 'Powered by GOAT')
    ]);

    // List
    var list = createElement('ul', { className: 'goat-widget-list' });
    rankings.forEach(function(item, idx) {
      var rankClass = 'goat-widget-rank ';
      if (item.consensus.rank === 1) rankClass += 'goat-widget-rank-1';
      else if (item.consensus.rank === 2) rankClass += 'goat-widget-rank-2';
      else if (item.consensus.rank === 3) rankClass += 'goat-widget-rank-3';
      else if (item.consensus.rank <= 10) rankClass += 'goat-widget-rank-top';
      else rankClass += 'goat-widget-rank-default';

      var itemEl = createElement('li', {
        className: 'goat-widget-item',
        'data-testid': 'goat-embed-item-' + item.id
      }, [
        createElement('span', { className: rankClass }, '#' + item.consensus.rank),
        item.imageUrl ? createElement('img', {
          className: 'goat-widget-image',
          src: item.imageUrl,
          alt: item.name,
          loading: 'lazy'
        }) : null,
        createElement('span', { className: 'goat-widget-name' }, item.name),
        config.showVolatility ? createElement('span', {
          className: 'goat-volatility goat-volatility-' + item.consensus.volatilityLevel
        }, item.consensus.volatilityLevel) : null,
        createElement('span', { className: 'goat-widget-votes' },
          item.consensus.totalRankings.toLocaleString() + ' votes')
      ]);
      list.appendChild(itemEl);
    });

    // Footer
    var footer = createElement('div', { className: 'goat-widget-footer' }, [
      createElement('a', {
        className: 'goat-widget-link',
        href: GOAT.baseUrl + '/explore/' + (config.category || '').toLowerCase(),
        target: '_blank',
        rel: 'noopener noreferrer',
        'data-testid': 'goat-embed-view-all'
      }, 'View full rankings on GOAT →')
    ]);

    widgetContainer.appendChild(header);
    widgetContainer.appendChild(list);
    widgetContainer.appendChild(footer);
    widget.appendChild(widgetContainer);

    container.innerHTML = '';
    container.appendChild(widget);
  }

  // Render badge widget
  function renderBadgeWidget(container, data, config) {
    var theme = config.theme || GOAT.defaults.theme;
    var item = data.item;

    var badge = createElement('a', {
      className: 'goat-widget goat-badge goat-badge-' + theme,
      href: GOAT.baseUrl + '/item/' + item.id,
      target: '_blank',
      rel: 'noopener noreferrer',
      'data-testid': 'goat-embed-badge'
    }, [
      createElement('span', {
        style: {
          color: item.consensus.rank <= 3 ? '#facc15' :
                 item.consensus.rank <= 10 ? '#22d3ee' : '#9ca3af'
        }
      }, '#' + item.consensus.rank),
      createElement('span', {}, 'GOAT Rank'),
      createElement('span', { style: { fontSize: '10px', opacity: 0.7 } }, '✨')
    ]);

    container.innerHTML = '';
    container.appendChild(badge);
  }

  // Render error
  function renderError(container, message, theme) {
    var widget = createElement('div', {
      className: 'goat-widget goat-widget-' + theme
    });
    var widgetContainer = createElement('div', { className: 'goat-widget-container' });
    widgetContainer.appendChild(createElement('div', { className: 'goat-widget-error' }, message));
    widget.appendChild(widgetContainer);
    container.innerHTML = '';
    container.appendChild(widget);
  }

  // Render loading
  function renderLoading(container, theme) {
    var widget = createElement('div', {
      className: 'goat-widget goat-widget-' + theme
    });
    var widgetContainer = createElement('div', { className: 'goat-widget-container' });
    widgetContainer.appendChild(createElement('div', { className: 'goat-widget-loading' }, 'Loading rankings...'));
    widget.appendChild(widgetContainer);
    container.innerHTML = '';
    container.appendChild(widget);
  }

  // Main render function
  GOAT.render = function(selector, config) {
    var container = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!container) {
      console.error('[GOAT] Container not found:', selector);
      return;
    }

    injectStyles();
    config = Object.assign({}, GOAT.defaults, config);

    renderLoading(container, config.theme);

    if (config.type === 'badge' && config.itemId) {
      fetchItem(config)
        .then(function(data) {
          renderBadgeWidget(container, data, config);
        })
        .catch(function(err) {
          renderError(container, 'Failed to load badge', config.theme);
        });
    } else {
      fetchRankings(config)
        .then(function(data) {
          renderRankingWidget(container, data, config);
        })
        .catch(function(err) {
          renderError(container, 'Failed to load rankings', config.theme);
        });
    }

    GOAT.widgets.push({ container: container, config: config });
  };

  // Auto-initialize widgets with data attributes
  GOAT.init = function() {
    injectStyles();
    var widgets = document.querySelectorAll('[data-goat-widget]');
    widgets.forEach(function(el) {
      var config = {
        apiKey: el.dataset.goatApiKey || '',
        type: el.dataset.goatWidget || 'ranking',
        category: el.dataset.goatCategory || '',
        subcategory: el.dataset.goatSubcategory || '',
        itemId: el.dataset.goatItemId || '',
        theme: el.dataset.goatTheme || 'dark',
        size: el.dataset.goatSize || 'default',
        limit: parseInt(el.dataset.goatLimit || '10', 10),
        showVolatility: el.dataset.goatShowVolatility === 'true'
      };
      GOAT.render(el, config);
    });
  };

  // Export to window
  window.GOAT = GOAT;

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', GOAT.init);
  } else {
    GOAT.init();
  }
})();
`;

  return new NextResponse(embedScript, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=3600',
      'X-GOAT-Api-Version': '1.0',
    },
  });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}
