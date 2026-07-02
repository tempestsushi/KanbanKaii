from unittest import TestCase

from app.integrations.slack.processing.message import prepare_slack_message


class SlackMessageTests(TestCase):
    def test_removes_all_connected_recipient_mentions(self) -> None:
        result = prepare_slack_message(
            "<@U1> <@U2> please fix checkout",
            ["U1", "U2"],
        )

        self.assertEqual(result, "please fix checkout")

    def test_mention_only_message_becomes_empty(self) -> None:
        self.assertEqual(prepare_slack_message("<@U1> ...", ["U1"]), "")

    def test_limits_model_input_to_fifty_words(self) -> None:
        text = "<@U1> " + " ".join(f"word{index}" for index in range(60))

        result = prepare_slack_message(text, ["U1"])

        self.assertEqual(len(result.split()), 50)
        self.assertEqual(result.split()[-1], "word49")
