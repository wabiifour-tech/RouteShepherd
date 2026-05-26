import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

fig, ax = plt.subplots(1, 1, figsize=(14, 10))
ax.set_xlim(0, 14)
ax.set_ylim(0, 10)
ax.axis('off')

# Color palette - DM-1 Deep Cyan inspired
BG = '#F4F8FC'
DARK_BG = '#162235'
ACCENT = '#37DCF2'
ACCENT2 = '#1B6B7A'
LIGHT_ACCENT = '#E0F4F8'
MID = '#5A6080'
TEXT = '#1A1A2E'
WHITE = '#FFFFFF'
SURFACE = '#F8F9FF'
BORDER = '#B0B8C0'

fig.patch.set_facecolor(WHITE)

# Title
ax.text(7, 9.6, 'RouteShepherd — System Architecture', fontsize=18, fontweight='bold',
        ha='center', va='center', color=TEXT, fontfamily='serif')
ax.text(7, 9.25, 'Intelligent Transit Coordination for Redemption City', fontsize=10,
        ha='center', va='center', color=MID, fontfamily='serif')

# --- Layer boxes ---
def draw_layer(ax, x, y, w, h, label, color, border_color, items=None, item_color=None, alpha=1.0):
    rect = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.15", 
                          facecolor=color, edgecolor=border_color, linewidth=1.5, alpha=alpha)
    ax.add_patch(rect)
    ax.text(x + w/2, y + h - 0.25, label, fontsize=11, fontweight='bold',
            ha='center', va='top', color=TEXT, fontfamily='serif')
    if items:
        iy = y + h - 0.6
        for item in items:
            item_rect = FancyBboxPatch((x + 0.2, iy - 0.22), w - 0.4, 0.35,
                                       boxstyle="round,pad=0.05", facecolor=item_color or WHITE,
                                       edgecolor=BORDER, linewidth=0.7)
            ax.add_patch(item_rect)
            ax.text(x + w/2, iy - 0.04, item, fontsize=8.5, ha='center', va='center',
                    color=TEXT, fontfamily='serif')
            iy -= 0.42

# Client Layer
draw_layer(ax, 0.3, 7.6, 13.2, 1.3, 'CLIENT LAYER', LIGHT_ACCENT, ACCENT2,
           ['Passenger Portal (React SPA)', 'Coordinator Dashboard (React SPA)', 
            'Driver Interface (React SPA)', 'Landing Page'],
           item_color=WHITE)

# Arrow down
ax.annotate('', xy=(7, 7.55), xytext=(7, 7.6),
            arrowprops=dict(arrowstyle='->', color=ACCENT2, lw=1.5))

# API Layer
draw_layer(ax, 0.3, 5.8, 13.2, 1.7, 'API GATEWAY / ROUTE HANDLERS', LIGHT_ACCENT, ACCENT2,
           ['GET/POST /api/events', 'GET /api/routes & /api/buses', 
            'POST /api/dispatch', 'GET /api/demand-forecasts',
            'POST /api/preregister', 'GET/POST /api/notifications'],
           item_color=WHITE)

# Arrow down
ax.annotate('', xy=(7, 5.75), xytext=(7, 5.8),
            arrowprops=dict(arrowstyle='->', color=ACCENT2, lw=1.5))

# Service Layer
draw_layer(ax, 0.3, 3.6, 6.2, 2.1, 'CORE SERVICES', LIGHT_ACCENT, ACCENT2,
           ['Demand Forecast Engine (z-ai-sdk)', 'Fleet Orchestration Service',
            'Real-Time Tracking (WebSocket/Socket.IO)', 'Notification & Alert Service'],
           item_color=WHITE)

# Auth Layer
draw_layer(ax, 6.8, 3.6, 6.7, 2.1, 'CROSS-CUTTING CONCERNS', LIGHT_ACCENT, ACCENT2,
           ['Authentication (NextAuth / JWT)', 'Authorization & Role-Based Access',
            'Input Validation (Zod Schemas)', 'Error Handling & Logging'],
           item_color=WHITE)

# Arrow down
ax.annotate('', xy=(4.5, 3.55), xytext=(4.5, 3.6),
            arrowprops=dict(arrowstyle='->', color=ACCENT2, lw=1.5))

# Data Layer
draw_layer(ax, 0.3, 1.5, 6.2, 2.0, 'DATA LAYER', LIGHT_ACCENT, ACCENT2,
           ['Prisma ORM (v6.11)', 'PostgreSQL (Neon/Vercel)',
            'Connection Pooling', 'Migration Management'],
           item_color=WHITE)

# External Services
draw_layer(ax, 6.8, 1.5, 6.7, 2.0, 'EXTERNAL INTEGRATIONS', LIGHT_ACCENT, ACCENT2,
           ['Vercel (Hosting & CDN)', 'z-ai-web-dev-sdk (AI Forecasts)',
            'Map Service (Leaflet/Mapbox)', 'SMS Gateway (Twilio/Africa\'s Talking)'],
           item_color=WHITE)

# Deployment label
ax.text(7, 0.9, 'Deployment: Vercel (Serverless) | Runtime: Bun | CI/CD: GitHub → Vercel',
        fontsize=9, ha='center', va='center', color=MID, fontfamily='serif',
        bbox=dict(boxstyle='round,pad=0.3', facecolor=SURFACE, edgecolor=BORDER, linewidth=0.7))

plt.tight_layout()
plt.savefig('/home/z/my-project/download/architecture_diagram.png', dpi=200, bbox_inches='tight',
            facecolor=WHITE, edgecolor='none')
plt.close()
print("Architecture diagram saved.")
