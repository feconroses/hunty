import json
import logging
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.company import Company
from app.models.filter_rule import FilterRule
from app.models.filter_section_order import FilterSectionOrder
from app.models.linkedin_search import LinkedInSearch
from app.schemas.filter_rule import CreateFilterRequest, UpdateFilterRequest
from app.services.activity_service import ActivityService

logger = logging.getLogger(__name__)

DEFAULT_SECTION_ORDER = [
    "title_include",
    "title_exclude",
    "description_include",
    "location",
    "seniority",
    "work_type",
    "min_salary",
    "free_text",
]

VALID_SECTION_KEYS = set(DEFAULT_SECTION_ORDER)


class FilterService:
    """Service for managing filter rules."""

    @staticmethod
    async def list_filters(
        db: AsyncSession, user_id: int
    ) -> list[FilterRule]:
        """List all filter rules for a user."""
        result = await db.execute(
            select(FilterRule)
            .where(FilterRule.user_id == user_id)
            .order_by(FilterRule.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_filter(
        db: AsyncSession, user_id: int, data: CreateFilterRequest
    ) -> FilterRule:
        """Create a new filter rule."""
        # Validate company ownership if company_id provided
        if data.company_id is not None:
            company_result = await db.execute(
                select(Company).where(
                    Company.id == data.company_id, Company.user_id == user_id
                )
            )
            if company_result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Company not found.",
                )

        # Validate LinkedIn search ownership if linkedin_search_id provided
        if data.linkedin_search_id is not None:
            search_result = await db.execute(
                select(LinkedInSearch).where(
                    LinkedInSearch.id == data.linkedin_search_id,
                    LinkedInSearch.user_id == user_id,
                )
            )
            if search_result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="LinkedIn search not found.",
                )

        filter_rule = FilterRule(
            user_id=user_id,
            company_id=data.company_id,
            linkedin_search_id=data.linkedin_search_id,
            rule_type=data.rule_type,
            value=data.value.strip(),
            logic_group=data.logic_group,
        )
        db.add(filter_rule)
        await db.flush()
        await db.refresh(filter_rule)

        await ActivityService.log(
            db,
            user_id=user_id,
            action="filter_created",
            entity_type="filter_rule",
            entity_id=filter_rule.id,
            details={"rule_type": filter_rule.rule_type, "value": filter_rule.value},
        )

        return filter_rule

    @staticmethod
    async def update_filter(
        db: AsyncSession, user_id: int, filter_id: int, data: UpdateFilterRequest
    ) -> FilterRule:
        """Update an existing filter rule."""
        result = await db.execute(
            select(FilterRule).where(
                FilterRule.id == filter_id, FilterRule.user_id == user_id
            )
        )
        filter_rule = result.scalar_one_or_none()
        if filter_rule is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Filter rule not found.",
            )

        if data.rule_type is not None:
            filter_rule.rule_type = data.rule_type
        if data.value is not None:
            filter_rule.value = data.value.strip()
        if data.logic_group is not None:
            filter_rule.logic_group = data.logic_group

        db.add(filter_rule)
        await db.flush()
        await db.refresh(filter_rule)

        await ActivityService.log(
            db,
            user_id=user_id,
            action="filter_updated",
            entity_type="filter_rule",
            entity_id=filter_rule.id,
        )

        return filter_rule

    @staticmethod
    async def delete_filter(
        db: AsyncSession, user_id: int, filter_id: int
    ) -> None:
        """Delete a filter rule."""
        result = await db.execute(
            select(FilterRule).where(
                FilterRule.id == filter_id, FilterRule.user_id == user_id
            )
        )
        filter_rule = result.scalar_one_or_none()
        if filter_rule is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Filter rule not found.",
            )

        await db.delete(filter_rule)
        await db.flush()

        await ActivityService.log(
            db,
            user_id=user_id,
            action="filter_deleted",
            entity_type="filter_rule",
            entity_id=filter_id,
        )

    @staticmethod
    async def get_section_order(
        db: AsyncSession, user_id: int
    ) -> list[str]:
        """Get the user's filter section order, or the default."""
        result = await db.execute(
            select(FilterSectionOrder).where(
                FilterSectionOrder.user_id == user_id
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            return list(DEFAULT_SECTION_ORDER)
        return json.loads(row.sections)

    @staticmethod
    async def update_section_order(
        db: AsyncSession, user_id: int, sections: list[str]
    ) -> list[str]:
        """Upsert the user's filter section order."""
        # Validate
        if set(sections) != VALID_SECTION_KEYS or len(sections) != len(VALID_SECTION_KEYS):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Must include exactly these section keys: {DEFAULT_SECTION_ORDER}",
            )

        result = await db.execute(
            select(FilterSectionOrder).where(
                FilterSectionOrder.user_id == user_id
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            row = FilterSectionOrder(user_id=user_id, sections=json.dumps(sections))
            db.add(row)
        else:
            row.sections = json.dumps(sections)
            db.add(row)
        await db.flush()
        return sections

    @staticmethod
    async def generate_prompt(
        db: AsyncSession, user_id: int, company_id: int
    ) -> str:
        """
        Generate a Claude prompt from filter rules.

        Combines general rules (company_id IS NULL) with company-specific rules
        into formatted text.
        """
        # Validate company ownership
        company_result = await db.execute(
            select(Company).where(
                Company.id == company_id, Company.user_id == user_id
            )
        )
        company = company_result.scalar_one_or_none()
        if company is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found.",
            )

        # Get general rules (no company)
        general_result = await db.execute(
            select(FilterRule).where(
                FilterRule.user_id == user_id,
                FilterRule.company_id.is_(None),
            )
        )
        general_rules = list(general_result.scalars().all())

        # Get company-specific rules
        company_result = await db.execute(
            select(FilterRule).where(
                FilterRule.user_id == user_id,
                FilterRule.company_id == company_id,
            )
        )
        company_rules = list(company_result.scalars().all())

        # Build the prompt
        sections = []
        sections.append(
            f"You are analyzing job listings from {company.name} ({company.url})."
        )
        sections.append(
            "Filter and evaluate each job based on the following criteria:"
        )

        # Get section order
        section_order = await FilterService.get_section_order(db, user_id)

        if general_rules:
            sections.append("\n## General Criteria")
            sections.append(_format_rules(general_rules, section_order))

        if company_rules:
            sections.append(f"\n## Company-Specific Criteria for {company.name}")
            sections.append(_format_rules(company_rules, section_order))

        sections.append(
            "\nFor each job, return a JSON object with: title, url, location, "
            "work_type, salary_min, salary_max, salary_currency, seniority_level, "
            "department, skills (array), description_summary, full_description, "
            "and a 'match_score' (0-100) indicating how well the job matches the criteria."
        )

        return "\n".join(sections)

    @staticmethod
    async def generate_linkedin_prompt(
        db: AsyncSession, user_id: int, linkedin_search_id: int
    ) -> str:
        """
        Generate a Claude prompt from filter rules for a LinkedIn search.

        Combines general rules (company_id IS NULL, linkedin_search_id IS NULL)
        with LinkedIn-search-specific rules.
        """
        # Validate search ownership
        search_result = await db.execute(
            select(LinkedInSearch).where(
                LinkedInSearch.id == linkedin_search_id,
                LinkedInSearch.user_id == user_id,
            )
        )
        search = search_result.scalar_one_or_none()
        if search is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LinkedIn search not found.",
            )

        # Get general rules (no company, no linkedin search)
        general_result = await db.execute(
            select(FilterRule).where(
                FilterRule.user_id == user_id,
                FilterRule.company_id.is_(None),
                FilterRule.linkedin_search_id.is_(None),
            )
        )
        general_rules = list(general_result.scalars().all())

        # Get linkedin-search-specific rules
        search_rules_result = await db.execute(
            select(FilterRule).where(
                FilterRule.user_id == user_id,
                FilterRule.linkedin_search_id == linkedin_search_id,
            )
        )
        search_rules = list(search_rules_result.scalars().all())

        # Build the prompt
        search_name = f"{search.keywords} — {search.location or 'Any location'}"
        sections = []
        sections.append(
            f'You are analyzing job listings from a LinkedIn search: "{search_name}".'
        )
        sections.append(
            "Filter and evaluate each job based on the following criteria:"
        )

        # Get section order
        section_order = await FilterService.get_section_order(db, user_id)

        if general_rules:
            sections.append("\n## General Criteria")
            sections.append(_format_rules(general_rules, section_order))

        if search_rules:
            sections.append(f"\n## Search-Specific Criteria for \"{search_name}\"")
            sections.append(_format_rules(search_rules, section_order))

        sections.append(
            "\nFor each job, return a JSON object with: title, url, location, "
            "work_type, salary_min, salary_max, salary_currency, seniority_level, "
            "department, skills (array), description_summary, full_description, "
            "company_name, and a 'match_score' (0-100) indicating how well the job "
            "matches the criteria."
        )

        return "\n".join(sections)


def _parse_rule(rule: FilterRule) -> tuple[str, str]:
    """Parse a rule's value into (category, actual_value)."""
    value = rule.value
    idx = value.find(":")
    if idx != -1:
        return value[:idx], value[idx + 1:]
    return "free_text", value


# Categories that support AND/OR grouping
_KEYWORD_CATEGORIES = {"title", "description"}


def _section_key_for_grouped(category: str, rule_type: str) -> str:
    """Map a grouped keyword rule to its section key."""
    if category == "title":
        return "title_include" if rule_type == "include" else "title_exclude"
    return "description_include"


def _section_key_for_rule(rule: FilterRule) -> str:
    """Map a single rule to its section key."""
    category, _ = _parse_rule(rule)
    if category in _KEYWORD_CATEGORIES:
        return _section_key_for_grouped(category, rule.rule_type)
    # Non-keyword categories map directly
    return category


def _format_rules(rules: list[FilterRule], section_order: list[str] | None = None) -> str:
    """Format a list of filter rules, grouping title/description by logic_group.

    Title/description rules are grouped by (category, rule_type, logic_group)
    and formatted as one line per group. Other rules are formatted individually.
    Lines are sorted by section_order if provided.
    """
    # Separate keyword rules (grouped) from other rules (individual)
    grouped: dict[tuple[str, str, str], list[str]] = {}
    other_entries: list[tuple[str, str]] = []  # (section_key, formatted_line)

    for rule in rules:
        category, value = _parse_rule(rule)
        if not value:
            continue

        if category in _KEYWORD_CATEGORIES and rule.logic_group:
            key = (category, rule.rule_type, rule.logic_group)
            grouped.setdefault(key, []).append(value)
        else:
            other_entries.append((_section_key_for_rule(rule), _format_rule(rule)))

    # Format grouped keyword rules
    keyword_entries: list[tuple[str, str]] = []  # (section_key, formatted_line)
    for (category, rule_type, logic_group), values in grouped.items():
        is_exclude = rule_type == "exclude"

        if category == "title":
            base = "Job title must NOT include" if is_exclude else "Job title MUST include"
        else:  # description
            base = "Job description must NOT mention" if is_exclude else "Job description MUST mention"

        if logic_group == "all":
            label = f"{base} ALL"
        else:  # any
            label = f"{base} at least ONE"

        section_key = _section_key_for_grouped(category, rule_type)
        keyword_entries.append((section_key, f"- {label}: {', '.join(values)}"))

    all_entries = keyword_entries + other_entries

    # Sort by section order if provided
    if section_order:
        order_map = {key: i for i, key in enumerate(section_order)}
        all_entries.sort(key=lambda e: order_map.get(e[0], 999))

    return "\n".join(line for _, line in all_entries)


def _format_rule(rule: FilterRule) -> str:
    """Format a single non-keyword filter rule as a readable line."""
    category, value = _parse_rule(rule)
    is_exclude = rule.rule_type == "exclude"

    category_labels = {
        "title": ("Job title must NOT include" if is_exclude else "Job title MUST include"),
        "description": ("Job description must NOT mention" if is_exclude else "Job description MUST mention"),
        "location": "Preferred location",
        "seniority": "Preferred seniority level",
        "work_type": "Preferred work type",
        "min_salary": "Minimum salary",
        "free_text": "General criteria",
    }

    label = category_labels.get(category, f"{'Exclude' if is_exclude else 'Include'} criteria")
    return f"- {label}: {value}"
