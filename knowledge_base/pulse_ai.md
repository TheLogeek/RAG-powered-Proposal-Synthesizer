# PULSE AI — Premier League Intelligence Engine
tags: machine learning, ensemble models, feature engineering, XGBoost, LightGBM, sports analytics, stacking, Python, Streamlit, regression, classification

PULSE AI is a professional-grade EPL match prediction system built on a three-model stacked ensemble: a home goals regressor, an away goals regressor, and an outcome classifier. Trained on 7 seasons (~2,600 matches) of EPL data with 200+ engineered features including dynamic Elo ratings, rolling form, head-to-head history, fatigue signals, and implied probabilities from betting odds.

## Ensemble Architecture
Three independent stacked regressors/classifiers, each using the same base layer pattern:

**Base layer (level-0):** GBM + Random Forest + XGBoost + LightGBM trained on the full feature set. Each base model produces out-of-fold predictions via cross-validation to prevent leakage into the meta-learner.

**Meta layer (level-1):** Ridge Regression (for goal regressors) and Logistic Regression (for the outcome classifier) trained on the out-of-fold predictions of the base models. The meta-learner learns how to weight and correct each base model's predictions rather than re-learning the raw features.

**Why stacking over simple averaging:** Each base model captures different signal — GBM is strong on non-linear feature interactions, Random Forest is robust to noisy features, XGBoost and LightGBM differ in their leaf-growth strategies (level-wise vs leaf-wise). A linear meta-learner can learn that GBM is more reliable for high-tempo matches while RF is more reliable when H2H data is sparse, rather than weighting all models equally regardless of context.

## Feature Engineering (200+ Features)
The feature set is the core technical contribution of the system.

**Dynamic Elo ratings:** Team strength ratings updated after every match using a goal-difference-weighted Elo formula. Standard Elo updates by win/draw/loss only; weighting by goal margin means a 4-0 win moves ratings more than a 1-0 win, which better reflects actual dominance. Home advantage is encoded as a fixed Elo bonus.

**Rolling form windows:** Goals scored/conceded, shots on target, corners, and win rate computed over last 3, 5, and 10 matches. Separate rolling windows for home and away fixtures to capture venue-specific form patterns that aggregate stats obscure.

**Fatigue features:** Days since last match and number of matches played in the previous 14 and 28 days. Fixture congestion effects are real and measurable — teams with 3 matches in 7 days show statistically degraded defensive performance.

**Head-to-head history:** Last 6 meetings between each pair, win rates, average goals, and a recency-weighted trend score that weights recent meetings more heavily than distant ones.

**Betting odds as features:** Implied probabilities derived from market odds are included as features, not just as a benchmark. Betting markets aggregate information from millions of predictors — treating odds as a feature rather than a comparison baseline is a deliberate choice to capture signal the model might not derive independently from raw match data.

## Data Pipeline
Historical data (2018–2026) downloaded automatically from football-data.co.uk on first launch, then cached locally as CSV. Current season updates are appended on each subsequent launch without re-downloading history. Live fixtures and standings fetched from ESPN's undocumented internal API with date-keyed JSON prediction caching — predictions for a given matchday are computed once, cached, and served from cache on repeat views.

Model files serialised as `.pkl` with joblib. First-run training takes 5–10 minutes; subsequent launches load from cache in seconds.

## Model Analytics Page
Exposes feature importance rankings (permutation importance over the test set, not impurity-based importance which overstates high-cardinality features), calibration curves for the outcome classifier (probability estimates vs actual frequency), and score distribution histograms. The "Elite Conviction" badge is triggered when all four base models agree on the same outcome within a tight probability margin — a measurable signal of ensemble consensus, not a UI flourish.

## Stack
Python, Streamlit, XGBoost, LightGBM, scikit-learn (GBM, Random Forest, Ridge, LogisticRegression, StackingClassifier/Regressor), pandas, numpy, joblib, requests. Deployed on Streamlit Cloud.
