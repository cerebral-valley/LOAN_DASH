# 5️⃣ plotly_template.py – import and use in each Streamlit page
import plotly.io as pio

TEMPLATE_NAME = "loan_dash_theme"

if TEMPLATE_NAME not in pio.templates:
    pio.templates[TEMPLATE_NAME] = pio.templates["plotly_white"]
    templ = pio.templates[TEMPLATE_NAME]

    templ.layout.colorway = ["#FDD835", "#26A69A", "#2E7D32", "#FFB300"]
    templ.layout.paper_bgcolor = "white"
    templ.layout.plot_bgcolor = "white"
    templ.layout.font.family = "Inter, sans-serif"
    templ.layout.title = dict(x=0.02, xanchor="left")

# Usage: fig.update_layout(template=TEMPLATE_NAME)
