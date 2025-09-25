"""ROUGE metric utilities for RAG testing."""


def calculate_rouge_l(reference_text: str, generated_text: str) -> float:
    """Calculate ROUGE-L score between reference and generated text.

    Args:
        reference_text: The reference text
        generated_text: The generated text to compare

    Returns:
        ROUGE-L F1 score (0.0 to 1.0)
    """
    if not reference_text or not generated_text:
        return 0.0

    ref_tokens = reference_text.lower().split()
    gen_tokens = generated_text.lower().split()

    if not ref_tokens or not gen_tokens:
        return 0.0

    def lcs_length(x: list[str], y: list[str]) -> int:
        m, n = len(x), len(y)
        dp = [[0] * (n + 1) for _ in range(m + 1)]

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if x[i - 1] == y[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1] + 1
                else:
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

        return dp[m][n]

    lcs_len = lcs_length(ref_tokens, gen_tokens)

    if lcs_len == 0:
        return 0.0

    precision = lcs_len / len(gen_tokens)
    recall = lcs_len / len(ref_tokens)

    if precision + recall == 0:
        return 0.0

    return (2 * precision * recall) / (precision + recall)


def calculate_rouge_n(reference_text: str, generated_text: str, n: int = 2) -> float:
    """Calculate ROUGE-N score between reference and generated text.

    Args:
        reference_text: The reference text
        generated_text: The generated text to compare
        n: The n-gram size (default: 2 for bigrams)

    Returns:
        ROUGE-N F1 score (0.0 to 1.0)
    """
    if not reference_text or not generated_text:
        return 0.0

    ref_tokens = reference_text.lower().split()
    gen_tokens = generated_text.lower().split()

    if len(ref_tokens) < n or len(gen_tokens) < n:
        return 0.0

    def create_ngrams(tokens: list[str], n: int) -> set[tuple[str, ...]]:
        return {tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}

    ref_ngrams = create_ngrams(ref_tokens, n)
    gen_ngrams = create_ngrams(gen_tokens, n)

    if not ref_ngrams or not gen_ngrams:
        return 0.0

    overlap = len(ref_ngrams & gen_ngrams)
    precision = overlap / len(gen_ngrams)
    recall = overlap / len(ref_ngrams)

    if precision + recall == 0:
        return 0.0

    return (2 * precision * recall) / (precision + recall)


def calculate_rouge_n_grams(reference_text: str, generated_text: str, n: int) -> float:
    """Calculate ROUGE-N F1 score using string-based n-grams.

    This implementation is equivalent to calculate_rouge_n but uses string joining
    for n-gram creation instead of tuples. Returns proper F1 score combining
    precision and recall.

    Args:
        reference_text: The reference text
        generated_text: The generated text to compare
        n: The n-gram size

    Returns:
        ROUGE-N F1 score (0.0 to 1.0)
    """
    if not reference_text or not generated_text or n <= 0:
        return 0.0

    ref_words = reference_text.lower().split()
    gen_words = generated_text.lower().split()

    if len(ref_words) < n or len(gen_words) < n:
        return 0.0

    ref_ngrams = [" ".join(ref_words[i : i + n]) for i in range(len(ref_words) - n + 1)]
    gen_ngrams = [" ".join(gen_words[i : i + n]) for i in range(len(gen_words) - n + 1)]

    if not ref_ngrams or not gen_ngrams:
        return 0.0

    # Count matches for precision and recall calculation
    matches = 0
    for ngram in gen_ngrams:
        if ngram in ref_ngrams:
            matches += 1

    # Calculate precision and recall
    precision = matches / len(gen_ngrams)
    recall = matches / len(ref_ngrams)

    # Return F1 score (harmonic mean of precision and recall)
    if precision + recall == 0:
        return 0.0

    return (2 * precision * recall) / (precision + recall)
