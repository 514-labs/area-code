from setuptools import setup, find_packages
import os

requirements_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
with open(requirements_path, "r") as f:
    requirements = []
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            if line == '../connectors':
                # Convert relative path to absolute file:// URL
                connectors_path = os.path.abspath(
                    os.path.join(os.path.dirname(__file__), '..', 'connectors')
                )
                requirements.append(f'connectors @ file://{connectors_path}')
            else:
                requirements.append(line)

setup(
    name='data-warehouse',
    version='0.0',
    packages=find_packages(),
    install_requires=requirements,
)