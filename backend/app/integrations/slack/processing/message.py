import re


MAX_SLACK_MESSAGE_WORDS = 50


def prepare_slack_message(text: str, mentioned_user_ids: list[str]) -> str:
    """Remove recipient mentions/punctuation and cap model input at 50 words."""
    cleaned = text
    for user_id in mentioned_user_ids:
        cleaned = cleaned.replace(f"<@{user_id}>", " ")
    cleaned = re.sub(r"^[\s,.:;!?\-–—]+|[\s,.:;!?\-–—]+$", "", cleaned)
    words = cleaned.split()
    return " ".join(words[:MAX_SLACK_MESSAGE_WORDS])
