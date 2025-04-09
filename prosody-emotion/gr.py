import gradio as gr
import matplotlib.pyplot as plt

data = {
    "Admiration": 0.8, "Adoration": 0.8, "Aesthetic Appreciation": 0.5, "Amusement": 1.3, "Anger": 5.5,
    "Anxiety": 8.3, "Awe": 2.0, "Awkwardness": 3.7, "Boredom": 2.2, "Calmness": 5.3, "Concentration": 6.7,
    "Confusion": 3.4, "Contempt": 1.5, "Contentment": 1.8, "Determination": 7.5, "Disappointment": 2.2,
    "Disgust": 1.6, "Distress": 8.8, "Doubt": 2.8, "Excitement": 2.9, "Fear": 9.6, "Sadness": 3.1
}

def plot_emotions():
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.barh(list(data.keys()), list(data.values()), color="skyblue")
    ax.set_xlabel("Percentage (%)")
    ax.set_title("Voice Emotion Analysis")
    plt.gca().invert_yaxis()
    plt.tight_layout()
    return fig

def plot_pie():
    top_emotions = dict(sorted(data.items(), key=lambda x: x[1], reverse=True)[:6])
    fig, ax = plt.subplots()
    ax.pie(top_emotions.values(), labels=top_emotions.keys(), autopct="%1.1f%%", colors=plt.cm.Paired.colors)
    ax.set_title("Top 6 Emotions")
    return fig

with gr.Blocks() as demo:
    gr.Markdown("## Voice Emotion Analysis")
    with gr.Row():
        gr.Plot(plot_emotions, label="Emotion Bar Chart")
        gr.Plot(plot_pie, label="Top 6 Emotions Pie Chart")

demo.launch()
