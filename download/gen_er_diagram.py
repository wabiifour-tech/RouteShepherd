import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

fig, ax = plt.subplots(1, 1, figsize=(16, 12))
ax.set_xlim(0, 16)
ax.set_ylim(0, 12)
ax.axis('off')

# Colors
WHITE = '#FFFFFF'
TEXT = '#1A1A2E'
ACCENT2 = '#1B6B7A'
LIGHT_ACCENT = '#E0F4F8'
BORDER = '#B0B8C0'
MID = '#5A6080'
HEADER_BG = '#1B6B7A'
HEADER_TEXT = '#FFFFFF'
ROW_ALT = '#F4F8FC'

fig.patch.set_facecolor(WHITE)

# Title
ax.text(8, 11.6, 'RouteShepherd — Database Schema (ER Diagram)', fontsize=17, fontweight='bold',
        ha='center', va='center', color=TEXT, fontfamily='serif')
ax.text(8, 11.25, '8 Entities | PostgreSQL via Prisma ORM', fontsize=10,
        ha='center', va='center', color=MID, fontfamily='serif')

def draw_entity(ax, x, y, w, name, fields, pk_fields=None, fk_fields=None):
    pk_fields = pk_fields or []
    fk_fields = fk_fields or []
    h = 0.38 * (len(fields) + 1) + 0.15
    
    # Main box
    rect = FancyBboxPatch((x, y - h), w, h, boxstyle="round,pad=0.08",
                          facecolor=WHITE, edgecolor=ACCENT2, linewidth=1.5)
    ax.add_patch(rect)
    
    # Header
    header_rect = FancyBboxPatch((x+0.03, y - 0.38), w - 0.06, 0.35,
                                  boxstyle="round,pad=0.04", facecolor=HEADER_BG,
                                  edgecolor='none')
    ax.add_patch(header_rect)
    ax.text(x + w/2, y - 0.20, name, fontsize=10, fontweight='bold',
            ha='center', va='center', color=HEADER_TEXT, fontfamily='serif')
    
    # Fields
    iy = y - 0.6
    for i, field in enumerate(fields):
        if i > 0 and i % 1 == 0:
            pass
        prefix = ''
        fcolor = TEXT
        if field in pk_fields:
            prefix = 'PK '
            fcolor = '#C0392B'
        elif field in fk_fields:
            prefix = 'FK '
            fcolor = '#2E86C1'
        
        if i % 2 == 0:
            alt_rect = FancyBboxPatch((x+0.03, iy - 0.14), w - 0.06, 0.32,
                                       boxstyle="round,pad=0.0", facecolor=ROW_ALT,
                                       edgecolor='none')
            ax.add_patch(alt_rect)
        
        ax.text(x + 0.15, iy, f'{prefix}{field}', fontsize=8, ha='left', va='center',
                color=fcolor, fontfamily='monospace')
        iy -= 0.36

# Entity definitions
entities = {
    'Event': {'x': 0.3, 'y': 10.2, 'w': 3.0,
              'fields': ['id: String @cuid()', 'name: String', 'description: String?', 
                         'date: DateTime', 'endDate: DateTime?', 'status: String',
                         'expectedAttendance: Int'],
              'pk': ['id: String @cuid()'], 'fk': []},
    'PickupPoint': {'x': 4.0, 'y': 10.2, 'w': 3.2,
                    'fields': ['id: String @cuid()', 'name: String', 'state: String',
                               'latitude: Float', 'longitude: Float', 'address: String?',
                               'capacity: Int?', 'active: Boolean'],
                    'pk': ['id: String @cuid()'], 'fk': []},
    'Route': {'x': 8.0, 'y': 10.2, 'w': 3.0,
              'fields': ['id: String @cuid()', 'name: String', 'fromPointId: String',
                         'toPointId: String', 'distanceKm: Float', 'estimatedMin: Int',
                         'status: String', 'eventId: String?'],
              'pk': ['id: String @cuid()'], 'fk': ['fromPointId: String', 'toPointId: String', 'eventId: String?']},
    'Bus': {'x': 12.0, 'y': 10.2, 'w': 3.2,
            'fields': ['id: String @cuid()', 'plateNumber: String', 'capacity: Int (29)',
                       'currentLoad: Int', 'status: BusStatus', 'driverName: String?',
                       'driverPhone: String?', 'routeId: String?', 'eventId: String?',
                       'latitude: Float', 'longitude: Float', 'lastUpdated: DateTime?'],
            'pk': ['id: String @cuid()'], 'fk': ['routeId: String?', 'eventId: String?']},
    'QueueEntry': {'x': 0.3, 'y': 6.0, 'w': 3.0,
                   'fields': ['id: String @cuid()', 'pickupPointId: String',
                              'estimatedWait: Int', 'queueLength: Int', 'recordedAt: DateTime'],
                   'pk': ['id: String @cuid()'], 'fk': ['pickupPointId: String']},
    'DemandForecast': {'x': 4.0, 'y': 6.0, 'w': 3.2,
                       'fields': ['id: String @cuid()', 'pickupPointId: String',
                                  'timeSlot: String', 'predictedDemand: Int',
                                  'confidence: Float (0.85)'],
                       'pk': ['id: String @cuid()'], 'fk': ['pickupPointId: String']},
    'Notification': {'x': 8.0, 'y': 6.0, 'w': 3.0,
                     'fields': ['id: String @cuid()', 'title: String', 'message: String',
                                'type: NotifType', 'target: NotifTarget', 'read: Boolean'],
                     'pk': ['id: String @cuid()'], 'fk': []},
    'PreRegistration': {'x': 12.0, 'y': 6.0, 'w': 3.2,
                        'fields': ['id: String @cuid()', 'fullName: String', 'phone: String',
                                   'pickupPointId: String', 'preferredTime: String',
                                   'passengers: Int?', 'status: RegStatus'],
                        'pk': ['id: String @cuid()'], 'fk': ['pickupPointId: String']},
}

for name, e in entities.items():
    draw_entity(ax, e['x'], e['y'], e['w'], name, e['fields'], e['pk'], e['fk'])

# Draw relationship lines
def draw_rel(ax, x1, y1, x2, y2, label='', color='#2E86C1'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=color, lw=1.2, connectionstyle='arc3,rad=0.1'))
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx, my + 0.15, label, fontsize=7, ha='center', va='center', color=color,
                fontfamily='serif', bbox=dict(boxstyle='round,pad=0.15', facecolor=WHITE, edgecolor='none'))

# Event → Route
draw_rel(ax, 3.3, 9.0, 8.0, 9.0, '1:N')
# Event → Bus
draw_rel(ax, 3.3, 8.8, 12.0, 8.8, '1:N')
# PickupPoint → Route (from)
draw_rel(ax, 7.2, 9.2, 8.0, 9.2, '1:N')
# PickupPoint → QueueEntry
draw_rel(ax, 5.0, 6.8, 2.0, 6.8, '1:N')
# PickupPoint → DemandForecast
draw_rel(ax, 5.6, 6.8, 5.6, 6.8, '1:N')
# PickupPoint → PreRegistration
draw_rel(ax, 7.2, 6.8, 12.0, 6.8, '1:N')
# Route → Bus
draw_rel(ax, 11.0, 9.0, 12.0, 9.0, '1:N')

# Legend
legend_y = 1.2
ax.text(1, legend_y, 'Legend:', fontsize=10, fontweight='bold', color=TEXT, fontfamily='serif')
ax.text(1, legend_y - 0.4, 'PK', fontsize=9, color='#C0392B', fontweight='bold', fontfamily='monospace')
ax.text(1.8, legend_y - 0.4, '= Primary Key', fontsize=9, color=TEXT, fontfamily='serif')
ax.text(4, legend_y - 0.4, 'FK', fontsize=9, color='#2E86C1', fontweight='bold', fontfamily='monospace')
ax.text(4.8, legend_y - 0.4, '= Foreign Key', fontsize=9, color=TEXT, fontfamily='serif')
ax.text(7, legend_y - 0.4, '1:N', fontsize=9, color='#2E86C1', fontfamily='serif')
ax.text(7.8, legend_y - 0.4, '= One-to-Many Relationship', fontsize=9, color=TEXT, fontfamily='serif')

# BusStatus enum
ax.text(1, legend_y - 0.9, 'BusStatus Enum: available | in-transit | loading | maintenance',
        fontsize=9, color=MID, fontfamily='monospace')
ax.text(1, legend_y - 1.3, 'NotifType: info | warning | success    |    NotifTarget: all | coordinator | passenger | driver',
        fontsize=9, color=MID, fontfamily='monospace')

plt.tight_layout()
plt.savefig('/home/z/my-project/download/er_diagram.png', dpi=200, bbox_inches='tight',
            facecolor=WHITE, edgecolor='none')
plt.close()
print("ER diagram saved.")
