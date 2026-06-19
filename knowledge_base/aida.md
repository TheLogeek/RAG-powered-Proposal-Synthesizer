# AIDA — AI Data Assistant
tags: machine learning, data preprocessing, scikit-learn, SMOTE, pipeline, Python, Streamlit, imbalanced data, feature engineering

AIDA is a guided ML preprocessing pipeline that takes a user from raw CSV/Excel upload through profiling, imputation, encoding, scaling, outlier handling, and class balancing, then proves whether those choices helped by training a baseline model before and after and reporting the delta. The core design thesis: most preprocessing tools either automate everything silently or make you write all the code — AIDA recommends, explains, and then measures.

## Architecture
Two-file split: `app.py` (Streamlit UI layer — thin, no ML logic) and `pipeline_utils.py` (all core ML/DS logic as pure functions). This separation is deliberate: `pipeline_utils.py` can be unit-tested with pytest without importing Streamlit, which has a global `st` state that makes headless testing awkward. Any function is callable from a notebook, script, or test without touching the UI. Tests are in `test_app.py`.

## Data Leakage Prevention — The Core Engineering Decision
AIDA enforces leakage prevention at the API level, not as a best-practice note.

**SMOTE leakage:** SMOTE synthesises minority-class samples by finding k-nearest neighbours in the feature space and interpolating new points between them. If SMOTE runs on the full dataset before the train/test split, some synthetic samples will have been generated using test-set points as neighbours — those test points have influenced the training distribution. Evaluation metrics become optimistic and invalid. AIDA's `pipeline_utils.apply_smote_train_only` takes only `X_train, y_train` as arguments — it cannot receive the full dataset by design.

**Scaler leakage:** `StandardScaler` computes mean and standard deviation from the data it sees. Fitting on the full dataset encodes test-set distribution information into the scale parameters. AIDA fits all scalers on `X_train` only, then applies the transform to `X_test`. This is enforced in `pipeline_utils.apply_scaling`.

**Tests that prove this:** `TestApplySmoteTrainOnly::test_test_set_is_unchanged` asserts the test fold is byte-identical before and after SMOTE runs. `TestApplyScaling::test_scaler_fit_on_train_only` asserts the scaler's mean and std match `X_train` statistics only.

## Imputation Strategy
Default recommendation is a transparent heuristic: high missingness (>35%) or skewed distribution (|skew| > 1.0) → Median; roughly symmetric + low missingness → Mean. KNN imputation is available but recommended away for high-missingness cases because degraded neighbour quality with many missing values makes KNN interpolation unreliable.

"Compare strategies" mode runs 5-fold cross-validation with a Random Forest under each strategy and reports which one actually produces the best macro-F1. The heuristic is the default (fast, no target column selection needed); CV mode is for when you want measured evidence rather than a rule of thumb.

## Evaluation Metrics — Why Not Accuracy
On an imbalanced dataset with 90% majority class, a model that always predicts the majority achieves 90% accuracy with zero recall on the minority. AIDA reports Precision, Recall, F1, and ROC-AUC, all macro-averaged so each class contributes equally regardless of frequency. Minority-class performance is visible, not buried in the aggregate.

Baseline model selection heuristic: binary target + ≥200 samples → LogisticRegression (interpretable, well-understood); multiclass or small dataset → RandomForestClassifier (handles multiclass natively, less sensitive to scale, no convergence issues). The UI explains the selection so users can challenge it.

## Scaling — Model-Aware Justification
The UI explains whether scaling is necessary based on the downstream model. Tree-based models split on thresholds and are invariant to monotonic feature transformations — scaling is irrelevant. Logistic Regression and KNN use gradient descent and Euclidean distance respectively — both assume features on comparable scales. A salary column and a binary flag on the same logistic regression without scaling causes the salary to dominate the gradient and distance calculation. This makes the interaction between preprocessing choice and model architecture explicit.

## Export Artifacts
Four downloadable outputs: `aida_cleaned_*.csv` (processed training fold post-SMOTE), `aida_pipeline.py` (standalone Python script built from the actual operation log, not a template — two different uploads produce two different scripts), `aida_report.md` (full data quality and modeling report with before/after metrics), and `aida_test_set.csv` (untouched held-out fold).

## Stack
Python, Streamlit, scikit-learn, imbalanced-learn (SMOTE), pandas, numpy, pytest. Deployed on Streamlit Cloud; all state in `st.session_state`, nothing written to disk server-side.
