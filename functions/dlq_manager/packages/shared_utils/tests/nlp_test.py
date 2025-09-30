from unittest.mock import Mock, patch

from packages.shared_utils.src.nlp import get_spacy_model, get_word_count, nlp


async def test_get_spacy_model_loads_once() -> None:
    original_value = nlp.value
    nlp.value = None

    try:
        with patch("spacy.load") as mock_load:
            mock_model = Mock()
            mock_load.return_value = mock_model

            model1 = get_spacy_model()
            model2 = get_spacy_model()

            assert model1 == model2
            assert model1 == mock_model
            mock_load.assert_called_once_with("en_core_web_sm")
    finally:
        nlp.value = original_value


async def test_get_word_count() -> None:
    mock_model = Mock()
    mock_token1 = Mock(is_punct=False, is_space=False)
    mock_token2 = Mock(is_punct=True, is_space=False)
    mock_token3 = Mock(is_punct=False, is_space=True)
    mock_token4 = Mock(is_punct=False, is_space=False)

    mock_model.return_value = [mock_token1, mock_token2, mock_token3, mock_token4]

    with patch(
        "packages.shared_utils.src.nlp.get_spacy_model", return_value=mock_model
    ):
        word_count = get_word_count("test text")

        assert word_count == 2
        mock_model.assert_called_once_with("test text")
