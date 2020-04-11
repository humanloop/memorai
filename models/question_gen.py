""" Our state of the art question generator AI """


class QuestionGenerator:

    def __init__(self) -> None:
        pass

    def gen_question(self, q_type: str, text: str) -> str:

        if q_type == 'closed':
            return 'woo a closed question'
        else:
            raise NotImplementedError

    def get_embeddings(self):
        return 0
